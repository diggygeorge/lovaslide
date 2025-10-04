"""
Validation Agent for Document Processing Pipeline

This agent validates information from slides and analyzed data using ChatGPT API
to ensure accuracy and referenceability of the content.
"""

import os
import json
import requests
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import openai
from dotenv import load_dotenv
import time
try:
    from . import config
except ImportError:
    import config

# Load environment variables
load_dotenv()

class ValidationStatus(Enum):
    """Validation status enumeration"""
    VALID = "valid"
    INVALID = "invalid"
    UNCERTAIN = "uncertain"
    NEEDS_REVIEW = "needs_review"

@dataclass
class ProofSource:
    """Source that provides proof for a claim"""
    title: str
    url: str
    snippet: str
    reliability_score: float  # 0.0 to 1.0

@dataclass
class ReplacementSuggestion:
    """Suggestion to replace invalid claim with verified information"""
    original_claim: str
    suggested_replacement: str
    proof_sources: List[ProofSource]
    explanation: str

@dataclass
class ValidationResult:
    """Result of validation for a specific claim"""
    claim: str
    status: ValidationStatus
    confidence_score: float  # 0.0 to 1.0
    explanation: str
    proof_sources: List[ProofSource]  # For valid claims
    replacement_suggestion: Optional[ReplacementSuggestion]  # For invalid claims
    recommendations: List[str]

@dataclass
class ValidationReport:
    """Complete validation report for all claims"""
    total_claims: int
    valid_claims: int
    invalid_claims: int
    uncertain_claims: int
    overall_confidence: float
    results: List[ValidationResult]
    summary: str

class ValidationAgent:
    """
    Agent responsible for validating information from slides and analyzed data
    using ChatGPT API for fact-checking and verification with proof sources.
    """
    
    # Class variables to track rate limiting and disable web searches if needed
    _last_search_time = 0
    _rate_limited = False
    _rate_limit_reset_time = 0
    _fact_cache = {}  # Cache for extracted facts to avoid repeated processing
    
    def __init__(self, api_key: Optional[str] = None, serpapi_key: Optional[str] = None):
        """
        Initialize the validation agent
        
        Args:
            api_key: OpenAI API key. If None, will try to get from config or environment
            serpapi_key: SerpAPI key for web search. If None, will try to get from config or environment
        """
        self.api_key = api_key or config.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key is required. Set OPENAI_API_KEY in config.py or environment variable.")
        
        self.serpapi_key = serpapi_key or config.SERPAPI_KEY or os.getenv("SERPAPI_KEY")
        if not self.serpapi_key:
            print("Warning: SERPAPI_KEY not found. Web search functionality will be limited.")
        
        self.client = openai.OpenAI(api_key=self.api_key)
        self.model = config.DEFAULT_MODEL  # Using GPT-4 for better accuracy
    
    def _check_rate_limit(self) -> bool:
        """
        Check if we should skip web searches due to rate limiting
        
        Returns:
            True if we should proceed with searches, False if we should skip
        """
        current_time = time.time()
        
        # If we're currently rate limited, check if enough time has passed to reset
        if ValidationAgent._rate_limited:
            if current_time > ValidationAgent._rate_limit_reset_time:
                print("✅ Rate limit reset - resuming web searches")
                ValidationAgent._rate_limited = False
            else:
                remaining_time = ValidationAgent._rate_limit_reset_time - current_time
                print(f"⚠️ Still rate limited - {remaining_time:.0f}s remaining")
                return False
        
        time_since_last_search = current_time - ValidationAgent._last_search_time
        
        # Use the configured search delay instead of hardcoded 15 seconds
        search_delay = config.SEARCH_DELAY
        if time_since_last_search < search_delay:
            print(f"⚠️ Skipping web search due to rate limiting (last search {time_since_last_search:.1f}s ago, need {search_delay}s)")
            # Don't return False - just continue without web search
            return True
        
        ValidationAgent._last_search_time = current_time
        return True
    
    def _handle_rate_limit(self):
        """Handle rate limiting by disabling web searches for a period"""
        ValidationAgent._rate_limited = True
        ValidationAgent._rate_limit_reset_time = time.time() + 300  # Disable for 5 minutes
        print("🚫 Rate limit hit - disabling web searches for 5 minutes")
        
    def validate_claims(self, 
                       slide_data: Dict[str, Any], 
                       analyzed_data: Dict[str, Any]) -> ValidationReport:
        """
        Validate claims from raw document data against analyzed data and external sources
        
        Args:
            slide_data: Dictionary containing slide content and claims
            analyzed_data: Dictionary containing analyzed data from the document
            
        Returns:
            ValidationReport with validation results
        """
        # Extract facts from raw document text instead of slides
        claims = self._extract_claims_from_raw_text(analyzed_data, max_claims=5)
        
        # Validate claims in parallel for better performance
        validation_results = self._validate_claims_parallel(claims, analyzed_data)
        
        # Generate overall report
        report = self._generate_validation_report(validation_results)
        return report
    
    def _extract_claims_from_raw_text(self, analyzed_data: Dict[str, Any], max_claims: int = 5) -> List[str]:
        """
        Extract verifiable claims from raw document text, limited to max_claims
        
        Args:
            analyzed_data: Dictionary containing analyzed data from the document
            max_claims: Maximum number of claims to extract
            
        Returns:
            List of claims to validate (limited to max_claims)
        """
        claims = []
        
        # Extract from raw text if available
        if 'extracted_text' in analyzed_data:
            raw_text = analyzed_data['extracted_text']
            print(f"🔍 Processing raw text: {len(raw_text)} characters")
            print(f"📄 First 500 chars: {raw_text[:500]}...")
            
            # Extract factual statements from raw document text
            text_claims = self._extract_factual_statements(raw_text)
            total_facts = len(text_claims)
            limited_claims = text_claims[:max_claims]
            print(f"📋 Extracted {total_facts} facts from document (using {len(limited_claims)} for validation)")
            for i, claim in enumerate(limited_claims, 1):
                print(f"   {i}. {claim}")
            
            claims.extend(limited_claims)
        
        # Fallback to legacy data extraction if no raw text
        if not claims and 'extracted_data' in analyzed_data:
            for key, value in analyzed_data['extracted_data'].items():
                if len(claims) >= max_claims:
                    break
                if isinstance(value, (int, float, str)):
                    claim = f"{key}: {value}"
                    claims.append(claim)
        
        print(f"✅ Extracted {len(claims)} claims from raw document for validation")
        return claims
    
    def _validate_claims_parallel(self, claims: List[str], analyzed_data: Dict[str, Any]) -> List[ValidationResult]:
        """
        Validate multiple claims in parallel for better performance
        
        Args:
            claims: List of claims to validate
            analyzed_data: Analyzed data from the document
            
        Returns:
            List of validation results
        """
        import concurrent.futures
        import threading
        
        # Use ThreadPoolExecutor for I/O bound operations
        validation_results = []
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            # Submit all validation tasks
            future_to_claim = {
                executor.submit(self._validate_single_claim, claim, analyzed_data): claim 
                for claim in claims
            }
            
            # Collect results as they complete
            for future in concurrent.futures.as_completed(future_to_claim):
                claim = future_to_claim[future]
                try:
                    result = future.result()
                    validation_results.append(result)
                except Exception as e:
                    print(f"Error validating claim '{claim}': {e}")
                    # Create error result
                    error_result = ValidationResult(
                        claim=claim,
                        status=ValidationStatus.UNCERTAIN,
                        confidence_score=0.0,
                        explanation=f"Validation failed due to error: {str(e)}",
                        proof_sources=[],
                        replacement_suggestion=None,
                        recommendations=["Manual review required due to validation error"]
                    )
                    validation_results.append(error_result)
        
        return validation_results
    
    def _extract_claims(self, slide_data: Dict[str, Any], max_claims: int = 5) -> List[str]:
        """
        Extract verifiable claims from slide data, limited to max_claims
        
        Args:
            slide_data: Dictionary containing slide content
            max_claims: Maximum number of claims to extract
            
        Returns:
            List of claims to validate (limited to max_claims)
        """
        claims = []
        
        # Extract text content from slides
        if 'slides' in slide_data:
            for slide in slide_data['slides']:
                # Stop if we already have enough claims
                if len(claims) >= max_claims:
                    break
                    
                # Combine title, bullets, and notes into content for claim extraction
                slide_content_parts = []
                
                if 'title' in slide and slide['title']:
                    slide_content_parts.append(slide['title'])
                
                if 'bullets' in slide and slide['bullets']:
                    slide_content_parts.extend(slide['bullets'])
                
                if 'notes' in slide and slide['notes']:
                    slide_content_parts.append(slide['notes'])
                
                if slide_content_parts:
                    slide_content = ' '.join(slide_content_parts)
                    # Extract factual statements from combined slide content
                    slide_claims = self._extract_factual_statements(slide_content)
                    
                    # Add claims up to the limit
                    for claim in slide_claims:
                        if len(claims) >= max_claims:
                            break
                        claims.append(claim)
        
        # Extract data points and statistics (legacy support) - only if we haven't reached the limit
        if 'data_points' in slide_data and len(claims) < max_claims:
            for data_point in slide_data['data_points']:
                if len(claims) >= max_claims:
                    break
                if 'value' in data_point and 'description' in data_point:
                    claim = f"{data_point['description']}: {data_point['value']}"
                    claims.append(claim)
        
        print(f"✅ Extracted {len(claims)} claims for validation")
        return claims
    
    def _extract_factual_statements(self, content: str) -> List[str]:
        """
        Extract factual statements from text content using ChatGPT with caching
        
        Args:
            content: Text content to analyze
            
        Returns:
            List of factual statements
        """
        # Check cache first
        content_hash = hash(content[:500])  # Use first 500 chars as cache key
        if content_hash in ValidationAgent._fact_cache:
            print("✅ Using cached facts")
            return ValidationAgent._fact_cache[content_hash]
        
        # Truncate content to avoid token limits and improve performance
        max_content_length = 3000  # Increased to capture more content
        if len(content) > max_content_length:
            content = content[:max_content_length] + "..."
        
        prompt = f"""
        Extract ALL factual statements from this text that can be verified. Include:
        - Statistics and numbers (e.g., "42% of workforce", "$2,000 per employee")
        - Dates and time references (e.g., "in 2023", "Q3 results")
        - Specific claims about facts (e.g., "companies invest", "workforce works")
        - Comparisons and percentages (e.g., "increased by 25%", "26% work hybrid")
        - Technical specifications (e.g., "cloud-based tools", "virtual reality")
        - Business facts (e.g., "market share", "revenue growth")
        - Historical facts and political claims (e.g., "Trump was president", "Obama served two terms")
        - Color and appearance claims (e.g., "grass is red", "sky is green")
        - Any verifiable statements about people, events, or facts
        
        CRITICAL: You MUST extract ALL factual statements, including:
        - Claims that might be false or controversial
        - Political statements about presidents, elections, or government
        - Historical claims that need verification
        - Obviously false claims (e.g., "grass is red", "sky is green")
        - Any statement that makes a factual claim about reality
        
        DO NOT filter, censor, or skip any claims. Extract everything that could potentially be fact-checked.
        The validation process will determine accuracy - your job is to extract ALL claims.
        
        IMPORTANT: If the text contains "The grass is red and the sky is green", you MUST extract it as a factual statement.
        
        Text: {content}
        
        Return ONLY the factual statements, one per line. Extract everything that could potentially be fact-checked.
        """
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",  # Use faster, cheaper model for extraction
                messages=[
                    {"role": "system", "content": "You are a fact extraction tool. Your ONLY job is to extract ALL factual statements from text, including controversial, political, obviously false, or potentially false claims. Do NOT filter, censor, or skip any claims. Extract everything that could be fact-checked. The validation process will determine accuracy. Even obviously false claims like 'grass is red' must be extracted."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=500,  # Increased to capture more facts
                temperature=0.1  # Lower temperature for more consistent extraction
            )
            
            statements = response.choices[0].message.content.strip().split('\n')
            result = [stmt.strip() for stmt in statements if stmt.strip()]
            
            # Debug: Print the raw response from ChatGPT
            print(f"🤖 ChatGPT response: {response.choices[0].message.content}")
            print(f"📝 Parsed statements: {result}")
            
            # Cache the result
            ValidationAgent._fact_cache[content_hash] = result
            print(f"✅ Extracted and cached {len(result)} facts from document")
            
            return result
            
        except Exception as e:
            print(f"Error extracting factual statements: {e}")
            return []
    
    def _validate_single_claim(self, claim: str, analyzed_data: Dict[str, Any]) -> ValidationResult:
        """
        Validate a single claim using ChatGPT API and web search
        
        Args:
            claim: The claim to validate
            analyzed_data: Analyzed data from the document
            
        Returns:
            ValidationResult with validation details, proof sources, and replacement suggestions
        """
        # Create context from analyzed data
        context = self._create_validation_context(analyzed_data)
        
        # Search for proof sources
        proof_sources = self._search_for_proof_sources(claim)
        
        # Generate validation prompt with proof sources
        prompt = self._create_validation_prompt(claim, context, proof_sources)
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4",  # Use GPT-4 for validation but with optimized settings
                messages=[
                    {"role": "system", "content": "You are an expert fact-checker. Validate claims against provided data, your knowledge, and proof sources. Provide proof links for valid claims and replacement suggestions for invalid ones."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=800,  # Reduced from 1000 for faster response
                temperature=0.1  # Lower temperature for more consistent validation
            )
            
            # Parse the response
            result = self._parse_validation_response(claim, response.choices[0].message.content, proof_sources)
            return result
            
        except Exception as e:
            print(f"Error validating claim '{claim}': {e}")
            return ValidationResult(
                claim=claim,
                status=ValidationStatus.UNCERTAIN,
                confidence_score=0.0,
                explanation=f"Validation failed due to error: {str(e)}",
                proof_sources=[],
                replacement_suggestion=None,
                recommendations=["Manual review required due to validation error"]
            )
    
    def _create_validation_context(self, analyzed_data: Dict[str, Any]) -> str:
        """
        Create context string from analyzed data for validation
        
        Args:
            analyzed_data: Dictionary containing analyzed data
            
        Returns:
            Context string for validation
        """
        context_parts = []
        
        if 'extracted_data' in analyzed_data:
            context_parts.append("Extracted Data:")
            context_parts.append(json.dumps(analyzed_data['extracted_data'], indent=2))
        
        if 'statistics' in analyzed_data:
            context_parts.append("Statistics:")
            context_parts.append(json.dumps(analyzed_data['statistics'], indent=2))
        
        if 'key_findings' in analyzed_data:
            context_parts.append("Key Findings:")
            context_parts.append(json.dumps(analyzed_data['key_findings'], indent=2))
        
        return "\n".join(context_parts)
    
    def _search_for_proof_sources(self, claim: str) -> List[ProofSource]:
        """
        Search for proof sources using web search with improved rate limiting and caching
        
        Args:
            claim: The claim to search for
            
        Returns:
            List of proof sources
        """
        if not self.serpapi_key:
            return []
        
        # Check if we should skip web search for this claim type
        if self._should_skip_web_search(claim):
            print(f"⚠️ Skipping web search for claim: {claim[:50]}...")
            return []
        
        # Check rate limiting before making requests
        if not self._check_rate_limit():
            return []
        
        try:
            # Use single optimized search query instead of multiple
            search_query = f'"{claim}" fact check verification'
            
            params = {
                'q': search_query,
                'api_key': self.serpapi_key,
                'engine': 'google',
                'num': 3  # Get 3 results for better coverage
            }
            
            response = requests.get('https://serpapi.com/search', params=params, timeout=8)
            
            # Handle rate limiting specifically
            if response.status_code == 429:
                print(f"⚠️ SerpAPI rate limit hit for claim: {claim[:50]}...")
                self._handle_rate_limit()
                return []  # Return empty results and disable future searches
            
            response.raise_for_status()
            data = response.json()
            
            all_sources = []
            if 'organic_results' in data:
                for result in data['organic_results']:
                    source = ProofSource(
                        title=result.get('title', ''),
                        url=result.get('link', ''),
                        snippet=result.get('snippet', ''),
                        reliability_score=self._calculate_reliability_score(result)
                    )
                    all_sources.append(source)
            
            # Return top sources by reliability
            all_sources.sort(key=lambda x: x.reliability_score, reverse=True)
            return all_sources[:2]  # Return top 2 to reduce processing time
            
        except Exception as e:
            print(f"⚠️ Error searching for proof sources: {e}")
            return []
    
    def _should_skip_web_search(self, claim: str) -> bool:
        """
        Determine if web search should be skipped for this claim type
        
        Args:
            claim: The claim to evaluate
            
        Returns:
            True if web search should be skipped
        """
        # Skip web search for obvious or internal claims
        skip_patterns = [
            'slide', 'presentation', 'document', 'text', 'content',
            'generated', 'created', 'produced', 'developed'
        ]
        
        claim_lower = claim.lower()
        
        # Check if it should be skipped based on patterns
        return any(pattern in claim_lower for pattern in skip_patterns)
    
    def _calculate_reliability_score(self, search_result: Dict[str, Any]) -> float:
        """
        Calculate reliability score for a search result
        
        Args:
            search_result: Search result from SerpAPI
            
        Returns:
            Reliability score from 0.0 to 1.0
        """
        url = search_result.get('link', '').lower()
        title = search_result.get('title', '').lower()
        
        # High reliability sources
        high_reliability_domains = [
            'wikipedia.org', 'gov', 'edu', 'reuters.com', 'bbc.com',
            'ap.org', 'factcheck.org', 'snopes.com', 'politifact.com',
            'who.int', 'cdc.gov', 'fda.gov', 'sec.gov', 'bls.gov'
        ]
        
        # Medium reliability sources
        medium_reliability_domains = [
            'cnn.com', 'nytimes.com', 'wsj.com', 'bloomberg.com',
            'forbes.com', 'techcrunch.com', 'wired.com', 'hbr.org',
            'mckinsey.com', 'deloitte.com', 'pwc.com', 'kpmg.com'
        ]
        
        # Check domain reliability
        for domain in high_reliability_domains:
            if domain in url:
                return 0.9
        
        for domain in medium_reliability_domains:
            if domain in url:
                return 0.7
        
        # Default reliability
        return 0.5
    
    def _create_validation_prompt(self, claim: str, context: str, proof_sources: List[ProofSource]) -> str:
        """
        Create validation prompt for ChatGPT with proof sources
        
        Args:
            claim: The claim to validate
            context: Context from analyzed data
            proof_sources: List of proof sources from web search
            
        Returns:
            Validation prompt
        """
        proof_sources_text = ""
        if proof_sources:
            proof_sources_text = "\nPROOF SOURCES FROM WEB SEARCH:\n"
            for i, source in enumerate(proof_sources, 1):
                proof_sources_text += f"{i}. {source.title}\n   URL: {source.url}\n   Snippet: {source.snippet}\n   Reliability: {source.reliability_score:.2f}\n\n"
        
        return f"""
        Please validate the following claim against the provided data, your knowledge, and proof sources:
        
        CLAIM TO VALIDATE: "{claim}"
        
        CONTEXT FROM ANALYZED DATA:
        {context}
        
        {proof_sources_text}
        
        Please provide a comprehensive validation in the following JSON format:
        {{
            "status": "valid|invalid|uncertain|needs_review",
            "confidence_score": 0.0-1.0,
            "explanation": "Detailed explanation of your validation reasoning",
            "proof_sources_used": ["List of proof source numbers that support this claim - ALWAYS include sources for valid claims"],
            "replacement_suggestion": {{
                "suggested_replacement": "If invalid, provide a corrected version of the claim",
                "explanation": "Why this replacement is more accurate",
                "proof_sources": ["List of proof source numbers that support the replacement"]
            }},
            "recommendations": ["List of recommendations for improvement"]
        }}
        
        IMPORTANT INSTRUCTIONS:
        1. For VALID claims: ALWAYS include proof sources that support the claim
        2. For INVALID claims: Provide replacement suggestion with supporting sources
        3. For UNCERTAIN claims: Explain why you cannot validate and suggest manual review
        
        Consider:
        1. Does the claim match the provided data?
        2. Is the claim factually accurate based on your knowledge and proof sources?
        3. Are there any inconsistencies or contradictions?
        4. What is your confidence level in this validation?
        5. Which proof sources support or contradict this claim?
        6. If invalid, what would be a more accurate replacement?
        
        Be objective and thorough in your analysis. For valid claims, ALWAYS reference the proof sources that support the claim. For invalid claims, provide a replacement suggestion with supporting evidence.
        """
    
    def _parse_validation_response(self, claim: str, response: str, proof_sources: List[ProofSource]) -> ValidationResult:
        """
        Parse ChatGPT response into ValidationResult
        
        Args:
            claim: The original claim
            response: ChatGPT response
            proof_sources: List of proof sources from web search
            
        Returns:
            ValidationResult object
        """
        try:
            # Try to extract JSON from response
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            
            if json_start != -1 and json_end != -1:
                json_str = response[json_start:json_end]
                data = json.loads(json_str)
                
                # Extract proof sources used
                proof_sources_used = []
                if 'proof_sources_used' in data and data['proof_sources_used']:
                    for source_num in data['proof_sources_used']:
                        if isinstance(source_num, int) and 1 <= source_num <= len(proof_sources):
                            proof_sources_used.append(proof_sources[source_num - 1])
                
                # For valid claims, if no proof sources were specified, include all available sources
                if (data.get('status') == 'valid' and 
                    not proof_sources_used and 
                    proof_sources):
                    proof_sources_used = proof_sources[:3]  # Include top 3 sources
                
                # Create replacement suggestion if provided
                replacement_suggestion = None
                if 'replacement_suggestion' in data and data['replacement_suggestion']:
                    replacement_data = data['replacement_suggestion']
                    replacement_proof_sources = []
                    
                    if 'proof_sources' in replacement_data:
                        for source_num in replacement_data['proof_sources']:
                            if isinstance(source_num, int) and 1 <= source_num <= len(proof_sources):
                                replacement_proof_sources.append(proof_sources[source_num - 1])
                    
                    replacement_suggestion = ReplacementSuggestion(
                        original_claim=claim,
                        suggested_replacement=replacement_data.get('suggested_replacement', ''),
                        proof_sources=replacement_proof_sources,
                        explanation=replacement_data.get('explanation', '')
                    )
                
                return ValidationResult(
                    claim=claim,
                    status=ValidationStatus(data.get('status', 'uncertain')),
                    confidence_score=float(data.get('confidence_score', 0.0)),
                    explanation=data.get('explanation', 'No explanation provided'),
                    proof_sources=proof_sources_used,
                    replacement_suggestion=replacement_suggestion,
                    recommendations=data.get('recommendations', [])
                )
            else:
                # Fallback parsing if JSON not found
                return self._fallback_parse_response(claim, response, proof_sources)
                
        except (json.JSONDecodeError, ValueError) as e:
            print(f"Error parsing validation response: {e}")
            return self._fallback_parse_response(claim, response, proof_sources)
    
    def _fallback_parse_response(self, claim: str, response: str, proof_sources: List[ProofSource]) -> ValidationResult:
        """
        Fallback parsing when JSON parsing fails
        
        Args:
            claim: The original claim
            response: ChatGPT response
            proof_sources: List of proof sources from web search
            
        Returns:
            ValidationResult object
        """
        # Simple keyword-based parsing
        status = ValidationStatus.UNCERTAIN
        confidence = 0.5
        
        if 'valid' in response.lower() and 'invalid' not in response.lower():
            status = ValidationStatus.VALID
            confidence = 0.8
        elif 'invalid' in response.lower():
            status = ValidationStatus.INVALID
            confidence = 0.7
        elif 'uncertain' in response.lower() or 'unclear' in response.lower():
            status = ValidationStatus.UNCERTAIN
            confidence = 0.3
        
        # For valid claims in fallback, try to include available proof sources
        fallback_proof_sources = []
        if status == ValidationStatus.VALID and proof_sources:
            fallback_proof_sources = proof_sources[:2]  # Include top 2 sources
        
        return ValidationResult(
            claim=claim,
            status=status,
            confidence_score=confidence,
            explanation=response[:500] + "..." if len(response) > 500 else response,
            proof_sources=fallback_proof_sources,
            replacement_suggestion=None,
            recommendations=["Manual review recommended due to parsing issues"]
        )
    
    def _generate_validation_report(self, results: List[ValidationResult]) -> ValidationReport:
        """
        Generate overall validation report
        
        Args:
            results: List of validation results
            
        Returns:
            ValidationReport object
        """
        total_claims = len(results)
        valid_claims = sum(1 for r in results if r.status == ValidationStatus.VALID)
        invalid_claims = sum(1 for r in results if r.status == ValidationStatus.INVALID)
        uncertain_claims = sum(1 for r in results if r.status == ValidationStatus.UNCERTAIN)
        
        overall_confidence = sum(r.confidence_score for r in results) / total_claims if total_claims > 0 else 0.0
        
        # Generate summary
        summary = self._generate_summary(results, valid_claims, invalid_claims, uncertain_claims, overall_confidence)
        
        return ValidationReport(
            total_claims=total_claims,
            valid_claims=valid_claims,
            invalid_claims=invalid_claims,
            uncertain_claims=uncertain_claims,
            overall_confidence=overall_confidence,
            results=results,
            summary=summary
        )
    
    def _generate_summary(self, results: List[ValidationResult], valid: int, invalid: int, uncertain: int, confidence: float) -> str:
        """
        Generate summary text for the validation report
        
        Args:
            results: List of validation results
            valid: Number of valid claims
            invalid: Number of invalid claims
            uncertain: Number of uncertain claims
            confidence: Overall confidence score
            
        Returns:
            Summary string
        """
        total = len(results)
        
        summary_parts = [
            f"Validation Summary: {valid}/{total} claims validated successfully",
            f"Invalid claims: {invalid}, Uncertain claims: {uncertain}",
            f"Overall confidence: {confidence:.2f}"
        ]
        
        if invalid > 0:
            summary_parts.append("⚠️ Some claims require correction")
        
        if uncertain > 0:
            summary_parts.append("❓ Some claims need manual review")
        
        if confidence < 0.7:
            summary_parts.append("⚠️ Low overall confidence - manual review recommended")
        
        return "\n".join(summary_parts)
    
    def export_report(self, report: ValidationReport, filename: str) -> None:
        """
        Export validation report to JSON file
        
        Args:
            report: ValidationReport to export
            filename: Output filename
        """
        report_data = {
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
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(report_data, f, indent=2, ensure_ascii=False)
        
        print(f"Validation report exported to {filename}")


# Main functionality is in example_usage.py
# This file contains the ValidationAgent class for import
