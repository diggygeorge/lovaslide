"""
Unified Backend API for LovaSlide
Combines file extraction, slide generation, and validation into a single API
"""

import os
import json
import tempfile
from typing import List, Dict, Any, Optional
from pathlib import Path
import time

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn

# Import our modules
from analyzer import Analyzer
from test_docs.extract import extract_docx, extract_pdf, extract_txt, extract_markdown
from test_docs.validation.validation_agent import ValidationAgent, ValidationReport

# Initialize FastAPI app
app = FastAPI(
    title="LovaSlide Backend API",
    description="Unified API for document processing, slide generation, and validation",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
analyzer = None
validation_agent = None

# Pydantic models for slide editing
class SlideEditRequest(BaseModel):
    deck: Dict[str, Any]
    note: str
    slide_index: Optional[int] = None  # If None, applies to entire deck

class SlideEditResponse(BaseModel):
    success: bool
    updated_deck: Dict[str, Any]
    message: str

# Initialize services
def initialize_services():
    """Initialize the analyzer and validation agent"""
    global analyzer, validation_agent
    
    try:
        analyzer = Analyzer()
        print("✅ Analyzer initialized successfully")
    except Exception as e:
        print(f"❌ Failed to initialize Analyzer: {e}")
        analyzer = None
    
    try:
        validation_agent = ValidationAgent()
        print("✅ Validation Agent initialized successfully")
    except Exception as e:
        print(f"⚠️ Validation Agent initialization failed: {e}")
        validation_agent = None

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    initialize_services()

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "analyzer_available": analyzer is not None,
        "validation_available": validation_agent is not None
    }


# Main endpoint - Create slides from document
@app.post("/create-slides")
async def create_slides(
    file: UploadFile = File(...),
    max_slides: int = Form(5),
    title: Optional[str] = Form(None)
):
    """
    Complete document processing pipeline in one endpoint:
    1. Extract text from uploaded file
    2. Create slides (deck JSON)
    3. Validate the generated slides
    4. Return slides + validation results
    
    This is the ONLY endpoint needed for the frontend.
    """
    if not analyzer:
        raise HTTPException(status_code=500, detail="Analyzer not available")
    
    if not validation_agent:
        raise HTTPException(status_code=500, detail="Validation agent not available")
    
    try:
        # Step 1: Extract text from file
        print(f"📄 Extracting text from {file.filename}...")
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        try:
            # Extract text based on file type
            file_extension = Path(file.filename).suffix.lower()
            
            if file_extension == '.pdf':
                text = extract_pdf(tmp_file_path)
            elif file_extension == '.docx':
                text = extract_docx(tmp_file_path)
            elif file_extension == '.txt':
                text = extract_txt(tmp_file_path)
            elif file_extension == '.md':
                text = extract_markdown(tmp_file_path)
            else:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Unsupported file type: {file_extension}. Supported types: .pdf, .docx, .txt, .md"
                )
            
            print(f"✅ Text extracted: {len(text)} characters")
            
        finally:
            # Clean up temporary file
            if os.path.exists(tmp_file_path):
                os.unlink(tmp_file_path)
        
        # Step 2: Create slides
        print(f"🎯 Creating {max_slides} slides...")
        deck = analyzer.create_deck_format(
            text=text,
            max_slides=max_slides,
            title=title
        )
        print(f"✅ Slides created: {deck['meta']['total_slides']} total slides")
        
        # Step 3: Validate the slides (optional - don't fail if validation fails)
        print("🔍 Validating slide content...")
        validation_results = {
            "total_claims": 0,
            "valid_claims": 0,
            "invalid_claims": 0,
            "uncertain_claims": 0,
            "overall_confidence": 0.0,
            "summary": "Validation not performed",
            "results": []
        }
        
        try:
            # Create analyzed data from extracted text
            analyzed_data = {
                "extracted_text": text,
                "text_length": len(text),
                "file_info": {
                    "filename": file.filename,
                    "file_type": file_extension
                }
            }
            
            # Validate claims
            report = validation_agent.validate_claims(
                slide_data=deck,
                analyzed_data=analyzed_data
            )
            
            # Convert validation report to dict
            validation_results = {
                "total_claims": report.total_claims,
                "valid_claims": report.valid_claims,
                "invalid_claims": report.invalid_claims,
                "uncertain_claims": report.uncertain_claims,
                "overall_confidence": report.overall_confidence,
                "summary": report.summary,
                "results": [
                    {
                        "claim": r.claim,
                        "status": r.status.value,
                        "confidence_score": r.confidence_score,
                        "explanation": r.explanation,
                        "proof_sources": [
                            {
                                "title": ps.title,
                                "url": ps.url,
                                "snippet": ps.snippet,
                                "reliability_score": ps.reliability_score
                            }
                            for ps in r.proof_sources
                        ],
                        "replacement_suggestion": {
                            "suggested_replacement": r.replacement_suggestion.suggested_replacement,
                            "explanation": r.replacement_suggestion.explanation,
                            "proof_sources": [
                                {
                                    "title": ps.title,
                                    "url": ps.url,
                                    "snippet": ps.snippet,
                                    "reliability_score": ps.reliability_score
                                }
                                for ps in r.replacement_suggestion.proof_sources
                            ]
                        } if r.replacement_suggestion else None,
                        "recommendations": r.recommendations
                    }
                    for r in report.results
                ]
            }
            
            print(f"✅ Validation complete: {report.valid_claims}/{report.total_claims} claims valid")
            
        except Exception as validation_error:
            print(f"⚠️ Validation failed: {str(validation_error)}")
            print("📝 Continuing without validation...")
            validation_results = {
                "total_claims": 0,
                "valid_claims": 0,
                "invalid_claims": 0,
                "uncertain_claims": 0,
                "overall_confidence": 0.0,
                "summary": f"Validation failed: {str(validation_error)}",
                "results": []
            }
        
        # Return the complete response
        return {
            "success": True,
            "slides": deck,  # The deck JSON
            "validation": validation_results,  # Validation results array
            "processed_at": time.time()
        }
    
    except Exception as e:
        print(f"❌ Error in create-slides: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")

# Edit slides based on user notes
@app.post("/edit-slides", response_model=SlideEditResponse)
async def edit_slides(request: SlideEditRequest):
    """
    Edit slides based on user notes using ChatGPT API.
    
    This endpoint takes a deck JSON and user notes, then uses ChatGPT to:
    1. Understand the requested changes
    2. Apply edits to the specified slide(s)
    3. Return the updated deck
    """
    if not analyzer:
        raise HTTPException(status_code=500, detail="Analyzer not available")
    
    try:
        print(f"📝 Processing slide edit request...")
        print(f"Note: {request.note}")
        print(f"Slide index: {request.slide_index}")
        
        # Use the analyzer to edit the deck based on the note
        updated_deck = analyzer.edit_deck_with_note(
            deck=request.deck,
            note=request.note,
            slide_index=request.slide_index
        )
        
        print(f"✅ Deck updated successfully")
        
        return SlideEditResponse(
            success=True,
            updated_deck=updated_deck,
            message="Slides updated successfully based on your note"
        )
    
    except Exception as e:
        print(f"❌ Error in edit-slides: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error editing slides: {str(e)}")

# Get available file types
@app.get("/supported-formats")
async def get_supported_formats():
    """Get list of supported file formats"""
    return {
        "supported_formats": [
            {
                "extension": ".pdf",
                "description": "PDF documents",
                "mime_type": "application/pdf"
            },
            {
                "extension": ".docx",
                "description": "Microsoft Word documents",
                "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            },
            {
                "extension": ".txt",
                "description": "Plain text files",
                "mime_type": "text/plain"
            },
            {
                "extension": ".md",
                "description": "Markdown files",
                "mime_type": "text/markdown"
            }
        ]
    }

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "status_code": exc.status_code}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)}
    )

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
