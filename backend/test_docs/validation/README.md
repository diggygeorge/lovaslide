# Validation Agent

A specialized agent for validating information from slides and analyzed data using ChatGPT API and web search to ensure accuracy and referenceability with proof sources and replacement suggestions.

## Features

-  **Claim Extraction**: Automatically extracts verifiable claims from slide content
-  **Fact-Checking**: Uses ChatGPT API to validate claims against analyzed data and external knowledge
-  **Web Search Integration**: Searches for proof sources using SerpAPI
-  **Proof Links**: Provides verifiable proof links for valid claims
-  **Replacement Suggestions**: Offers corrected information for invalid claims with supporting sources
-  **Confidence Scoring**: Provides confidence scores for each validation
-  **Comprehensive Reports**: Generates detailed validation reports with recommendations
-  **JSON Export**: Exports validation results in structured JSON format

## Installation

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Set up environment variables:

```bash
cp env_example.txt .env
# Edit .env and add your OpenAI API key and SerpAPI key
```

## Usage

### Basic Usage

```python
from validation_agent import ValidationAgent

# Initialize the agent
agent = ValidationAgent()

# Prepare your data
slide_data = {
    "slides": [
        {"content": "Revenue increased by 25% in Q3 2023"}
    ],
    "data_points": [
        {"description": "Q3 Revenue Growth", "value": "25%"}
    ]
}

analyzed_data = {
    "extracted_data": {"revenue_growth": 0.25},
    "statistics": {"growth_rate": 0.25},
    "key_findings": ["25% revenue growth in Q3"]
}

# Validate claims
report = agent.validate_claims(slide_data, analyzed_data)

# Export report
agent.export_report(report, "validation_report.json")
```

### Integration with Other Agents

The ValidationAgent is designed to work with other agents in your pipeline:

1. **Data Extraction Agent**: Provides `analyzed_data`
2. **Analysis Agent**: Enhances `analyzed_data` with insights
3. **Slide Generation Agent**: Provides `slide_data`
4. **Validation Agent**: Validates the final output

## API Reference

### ValidationAgent Class

#### `__init__(api_key=None, serpapi_key=None)`

Initialize the validation agent with OpenAI API key and SerpAPI key for web search.

#### `validate_claims(slide_data, analyzed_data)`

Validate claims from slide data against analyzed data.

**Parameters:**

-  `slide_data` (dict): Dictionary containing slide content and data points
-  `analyzed_data` (dict): Dictionary containing analyzed data from the document

**Returns:**

-  `ValidationReport`: Complete validation report with results

#### `export_report(report, filename)`

Export validation report to JSON file.

### Data Structures

#### ValidationResult

-  `claim` (str): The claim being validated
-  `status` (ValidationStatus): Validation status (invalid/uncertain)
-  `confidence_score` (float): Confidence score from 0.0 to 1.0
-  `explanation` (str): Detailed explanation of validation
-  `proof_sources` (List[ProofSource]): Proof sources for claims
-  `replacement_suggestion` (Optional[ReplacementSuggestion]): Replacement suggestion for invalid claims
-  `recommendations` (List[str]): Recommendations for improvement

#### ProofSource

-  `title` (str): Title of the source
-  `url` (str): URL of the source
-  `snippet` (str): Relevant snippet from the source
-  `reliability_score` (float): Reliability score from 0.0 to 1.0

#### ReplacementSuggestion

-  `original_claim` (str): The original invalid claim
-  `suggested_replacement` (str): The suggested corrected claim
-  `proof_sources` (List[ProofSource]): Sources supporting the replacement
-  `explanation` (str): Explanation of why the replacement is better

#### ValidationReport

-  `total_claims` (int): Total number of claims analyzed
-  `invalid_claims` (int): Number of invalid claims
-  `uncertain_claims` (int): Number of uncertain claims
-  `overall_confidence` (float): Overall confidence score
-  `results` (List[ValidationResult]): Individual validation results
-  `summary` (str): Summary of validation results

## Example Output

```json
{
   "total_claims": 2,
   "invalid_claims": 0,
   "uncertain_claims": 2,
   "overall_confidence": 0.95,
   "summary": "Validation Summary: 2 claims analyzed",
   "results": [
      {
         "claim": "Revenue increased by 25% in Q3 2023",
         "status": "uncertain",
         "confidence_score": 0.95,
         "explanation": "Claim matches the provided data showing 25% growth from Q2 to Q3 2023",
         "proof_sources": [
            {
               "title": "Parsons' Q3 2023 Revenue Increases 25% to $1.4B",
               "url": "https://www.govconwire.com/articles/parsons-q3-2023-revenue-increases-25-to-1-4b",
               "snippet": "In the three months that ended Sept. 30, 2023, total revenue rose 25 percent year-over-year...",
               "reliability_score": 0.9
            }
         ],
         "replacement_suggestion": null,
         "recommendations": []
      }
   ]
}
```

## Error Handling

The agent includes comprehensive error handling:

-  API connection issues
-  Invalid responses
-  Parsing errors
-  Missing data

All errors are logged and the agent continues processing other claims.

## Configuration

-  **Model**: Uses GPT-4 for better accuracy (configurable)
-  **Temperature**: Set to 0.1 for consistent results
-  **Max Tokens**: 800 for detailed explanations

## Dependencies

-  `openai>=1.0.0`: OpenAI API client
-  `python-dotenv>=1.0.0`: Environment variable management
-  `pydantic>=2.0.0`: Data validation
-  `requests>=2.31.0`: HTTP requests
-  `typing-extensions>=4.0.0`: Type hints support
-  `google-search-results>=2.4.2`: SerpAPI client for web search

## API Keys Required

1. **OpenAI API Key**: For ChatGPT validation

   -  Get from: https://platform.openai.com/api-keys
   -  Set as: `OPENAI_API_KEY`

2. **SerpAPI Key**: For web search and proof sources
   -  Get from: https://serpapi.com/
   -  Set as: `SERPAPI_KEY`
   -  Note: SerpAPI offers 100 free searches per month
