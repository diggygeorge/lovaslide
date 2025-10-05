"""
Example usage of the ValidationAgent

This script demonstrates how to use the ValidationAgent to validate
information from slides and analyzed data.
"""

from validation_agent import ValidationAgent, ValidationStatus
import json

def example_validation():
    """Example of how to use the ValidationAgent"""
    
    # Example slide data (what would come from your slide generation agent)
    slide_data = {
        "slides": [
            {
                "content": """
                Q3 2023 Performance Summary
                
                • Revenue increased by 25% compared to Q2 2023
                • Market share reached 15% in the technology sector
                • Customer satisfaction score improved to 4.8/5.0
                • Operating expenses decreased by 10%
                • New product launch contributed 30% to total revenue
                """
            },
            {
                "content": """
                Key Metrics Dashboard
                
                • Total revenue: $2.5M (up from $2.0M in Q2)
                • Active customers: 1,250 (15% increase)
                • Average deal size: $2,000
                • Customer acquisition cost: $150
                • Monthly recurring revenue: $800K
                """
            }
        ],
        "data_points": [
            {"description": "Q3 Revenue Growth", "value": "25%"},
            {"description": "Market Share", "value": "15%"},
            {"description": "Customer Satisfaction", "value": "4.8/5.0"},
            {"description": "Operating Expense Reduction", "value": "10%"},
            {"description": "New Product Revenue Contribution", "value": "30%"},
            {"description": "Total Revenue Q3", "value": "$2.5M"},
            {"description": "Active Customers", "value": "1,250"},
            {"description": "Average Deal Size", "value": "$2,000"},
            {"description": "Customer Acquisition Cost", "value": "$150"},
            {"description": "Monthly Recurring Revenue", "value": "$800K"}
        ]
    }
    
    # Example analyzed data (what would come from your data extraction and analysis agents)
    analyzed_data = {
        "extracted_data": {
            "revenue_q2_2023": 2000000,
            "revenue_q3_2023": 2500000,
            "market_share": 0.15,
            "customer_satisfaction": 4.8,
            "operating_expenses_q2": 800000,
            "operating_expenses_q3": 720000,
            "new_product_revenue": 750000,
            "total_revenue_q3": 2500000,
            "active_customers": 1250,
            "average_deal_size": 2000,
            "customer_acquisition_cost": 150,
            "monthly_recurring_revenue": 800000
        },
        "statistics": {
            "revenue_growth_rate": 0.25,
            "market_share_percentage": 15,
            "satisfaction_score": 4.8,
            "expense_reduction_rate": 0.10,
            "new_product_contribution": 0.30,
            "customer_growth_rate": 0.15
        },
        "key_findings": [
            "Revenue growth of 25% from Q2 to Q3 2023",
            "Market share maintained at 15% in technology sector",
            "Customer satisfaction improved to 4.8/5.0",
            "Operating expenses reduced by 10%",
            "New product contributed 30% to total revenue",
            "Total revenue reached $2.5M in Q3",
            "Active customer base grew to 1,250",
            "Average deal size remained stable at $2,000",
            "Customer acquisition cost optimized to $150",
            "Monthly recurring revenue reached $800K"
        ]
    }
    
    try:
        # Initialize validation agent
        print("Initializing ValidationAgent...")
        agent = ValidationAgent()
        
        # Validate claims
        print("Starting validation process...")
        report = agent.validate_claims(slide_data, analyzed_data)
        
        # Display results
        print("\n" + "="*60)
        print("VALIDATION REPORT")
        print("="*60)
        print(report.summary)
        print("\nDetailed Results:")
        print("-" * 60)
        
        for i, result in enumerate(report.results, 1):
            status_emoji = {
                ValidationStatus.VALID: "✅",
                ValidationStatus.INVALID: "❌",
                ValidationStatus.UNCERTAIN: "❓",
                ValidationStatus.NEEDS_REVIEW: "⚠️"
            }
            
            print(f"\n{i}. {status_emoji.get(result.status, '❓')} Claim: {result.claim}")
            print(f"   Status: {result.status.value.upper()}")
            print(f"   Confidence: {result.confidence_score:.2f}")
            print(f"   Explanation: {result.explanation}")
            
            # Show proof sources for valid claims
            if result.proof_sources:
                print(f"   Proof Sources:")
                for j, source in enumerate(result.proof_sources, 1):
                    print(f"     {j}. {source.title}")
                    print(f"        URL: {source.url}")
                    print(f"        Snippet: {source.snippet[:100]}...")
                    print(f"        Reliability: {source.reliability_score:.2f}")
            
            # Show replacement suggestion for invalid claims
            if result.replacement_suggestion:
                print(f"   Replacement Suggestion:")
                print(f"     Original: {result.replacement_suggestion.original_claim}")
                print(f"     Suggested: {result.replacement_suggestion.suggested_replacement}")
                print(f"     Explanation: {result.replacement_suggestion.explanation}")
                
                if result.replacement_suggestion.proof_sources:
                    print(f"     Supporting Sources:")
                    for j, source in enumerate(result.replacement_suggestion.proof_sources, 1):
                        print(f"       {j}. {source.title}")
                        print(f"          URL: {source.url}")
                        print(f"          Reliability: {source.reliability_score:.2f}")
            
            if result.recommendations:
                print(f"   Recommendations:")
                for rec in result.recommendations:
                    print(f"     • {rec}")
        
        # Export report
        print(f"\nExporting validation report...")
        agent.export_report(report, "example_validation_report.json")
        print("Report exported to 'example_validation_report.json'")
        
        # Display summary statistics
        print(f"\nSummary Statistics:")
        print(f"Total claims validated: {report.total_claims}")
        print(f"Valid claims: {report.valid_claims} ({report.valid_claims/report.total_claims*100:.1f}%)")
        print(f"Invalid claims: {report.invalid_claims} ({report.invalid_claims/report.total_claims*100:.1f}%)")
        print(f"Uncertain claims: {report.uncertain_claims} ({report.uncertain_claims/report.total_claims*100:.1f}%)")
        print(f"Overall confidence: {report.overall_confidence:.2f}")
        
        # Recommendations based on results
        if report.overall_confidence < 0.7:
            print("\n⚠️  WARNING: Low overall confidence. Manual review recommended.")
        
        if report.invalid_claims > 0:
            print(f"\n❌ {report.invalid_claims} invalid claims found. Please review and correct.")
        
        if report.uncertain_claims > 0:
            print(f"\n❓ {report.uncertain_claims} uncertain claims. Additional verification needed.")
        
    except Exception as e:
        print(f"Error: {e}")
        print("Make sure to set your OPENAI_API_KEY environment variable")

def test_with_minimal_data():
    """Test with minimal data to show basic functionality"""
    
    print("\n" + "="*60)
    print("TESTING WITH MINIMAL DATA")
    print("="*60)
    
    minimal_slide_data = {
        "slides": [
            {"content": "Our company revenue is $1M and we have 100 employees."}
        ],
        "data_points": [
            {"description": "Company Revenue", "value": "$1M"},
            {"description": "Employee Count", "value": "100"}
        ]
    }
    
    minimal_analyzed_data = {
        "extracted_data": {
            "revenue": 1000000,
            "employee_count": 100
        },
        "statistics": {
            "revenue_amount": 1000000,
            "total_employees": 100
        },
        "key_findings": [
            "Company revenue is $1M",
            "Total employees: 100"
        ]
    }
    
    try:
        agent = ValidationAgent()
        report = agent.validate_claims(minimal_slide_data, minimal_analyzed_data)
        
        print(f"Minimal test completed. {report.total_claims} claims validated.")
        print(f"Overall confidence: {report.overall_confidence:.2f}")
        
    except Exception as e:
        print(f"Minimal test error: {e}")

if __name__ == "__main__":
    # Run the main example
    example_validation()
    
    # Run minimal test
    test_with_minimal_data()
