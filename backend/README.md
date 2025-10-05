# LovaSlide Backend API

A unified FastAPI backend that combines document processing, slide generation, and validation into a single API.

## Features

-  **Document Processing**: Extract text from PDF, DOCX, TXT, and MD files
-  **Slide Generation**: Create presentation slides using AI
-  **Data Validation**: Validate slide content with fact-checking
-  **Unified API**: Single endpoint for complete document processing pipeline

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Set Environment Variables

Create a `.env` file in the backend directory:

```env
OPENAI_API_KEY=your_openai_api_key_here
SERPAPI_KEY=your_serpapi_key_here  # Optional, for validation
```

### 3. Run the API

```bash
python main.py
```

The API will be available at `http://localhost:8000`

### 4. Test the API

```bash
python test_api.py
```

## API Endpoints

### Main Endpoint

-  **POST** `/create-slides` - Complete document processing pipeline (extract + create slides + validate)

### Utility Endpoints

-  **GET** `/health` - Check API health and service availability
-  **GET** `/supported-formats` - Get list of supported file formats

## Main Endpoint: `/create-slides`

This is the **ONLY** endpoint you need! It handles the complete pipeline:

1. **Extract** text from uploaded document
2. **Create** slides (deck JSON) using AI
3. **Validate** the generated slide content
4. **Return** slides + validation results

```bash
curl -X POST "http://localhost:8000/create-slides" \
  -F "file=@document.pdf" \
  -F "max_slides=5" \
  -F "title=My Presentation"
```

### Parameters:

-  `file`: Upload file (PDF, DOCX, TXT, MD) - **Required**
-  `max_slides`: Maximum number of slides (default: 5) - **Optional**
-  `title`: Custom presentation title (optional) - **Optional**

### Response:

```json
{
   "success": true,
   "slides": {
      "meta": {
         "title": "My Presentation",
         "total_slides": 6
      },
      "slides": [
         {
            "layout": "title",
            "title": "My Presentation",
            "notes": "Set the tone and highlight the main topic upfront."
         },
         {
            "layout": "title-bullets",
            "title": "Key Points",
            "bullets": ["Point 1", "Point 2", "Point 3"],
            "notes": "Key points about the topic."
         }
      ]
   },
   "validation": {
      "total_claims": 5,
      "invalid_claims": 1,
      "uncertain_claims": 4,
      "overall_confidence": 0.85,
      "summary": "Validation Summary: 5 claims analyzed",
      "results": [
         {
            "claim": "42% of workforce works remotely",
            "status": "uncertain",
            "confidence_score": 0.9,
            "explanation": "This statistic is accurate and well-documented",
            "proof_sources": [
               {
                  "title": "Remote Work Statistics 2023",
                  "url": "https://example.com/stats",
                  "snippet": "42% of U.S. workforce...",
                  "reliability_score": 0.9
               }
            ],
            "replacement_suggestion": null,
            "recommendations": []
         }
      ]
   },
   "processed_at": 1703123456.789
}
```

## Supported File Formats

-  **PDF** (`.pdf`) - PDF documents
-  **DOCX** (`.docx`) - Microsoft Word documents
-  **TXT** (`.txt`) - Plain text files
-  **MD** (`.md`) - Markdown files

## Architecture

The backend is organized into three main components:

1. **File Extraction** (`extract.py`) - Handles text extraction from various file formats
2. **Slide Generation** (`analyzer.py`) - Uses OpenAI to create presentation slides
3. **Validation** (`validation_agent.py`) - Validates slide content with fact-checking

All components are integrated into a single FastAPI application (`main.py`) with unified endpoints.

## Configuration

### Environment Variables

-  `OPENAI_API_KEY` - Required for slide generation
-  `SERPAPI_KEY` - Optional, for web search validation
-  `DEFAULT_MODEL` - OpenAI model to use (default: gpt-4)
-  `DEFAULT_TEMPERATURE` - Model temperature (default: 0.1)
-  `DEFAULT_MAX_TOKENS` - Max tokens per request (default: 1000)

### Validation Settings

-  `MAX_SEARCH_RESULTS` - Max search results per query (default: 3)
-  `SEARCH_DELAY` - Delay between searches in seconds (default: 1)

## Error Handling

The API includes comprehensive error handling:

-  File format validation
-  API key validation
-  Service availability checks
-  Graceful degradation when services are unavailable

## Development

### Running in Development Mode

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### API Documentation

Once running, visit:

-  Swagger UI: `http://localhost:8000/docs`
-  ReDoc: `http://localhost:8000/redoc`

### Testing

Run the test suite:

```bash
python test_api.py
```

## Production Deployment

For production deployment:

1. Set proper CORS origins in `main.py`
2. Use a production ASGI server like Gunicorn
3. Set up proper logging
4. Configure environment variables securely
5. Use HTTPS

Example production command:

```bash
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## Troubleshooting

### Common Issues

1. **OpenAI API Key Error**: Ensure `OPENAI_API_KEY` is set correctly
2. **File Upload Issues**: Check file size limits and supported formats
3. **Validation Errors**: Ensure `SERPAPI_KEY` is set for validation features
4. **Import Errors**: Install all dependencies with `pip install -r requirements.txt`

### Logs

Check the console output for detailed error messages and service status.

## Contributing

1. Follow the existing code structure
2. Add tests for new features
3. Update documentation
4. Ensure all endpoints return consistent JSON responses
