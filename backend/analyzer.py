"""
Analyzer - Simple text to slides converter using OpenAI API
"""

import os
from typing import List, Dict, Any
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Analyzer:
    def __init__(self, api_key: str = None):
        """
        Initialize Analyzer with OpenAI API key.
        
        Args:
            api_key: OpenAI API key. If not provided, will look for OPENAI_API_KEY env var.
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key is required. Set OPENAI_API_KEY environment variable or pass api_key parameter.")
        
        self.client = OpenAI(api_key=self.api_key)
    
    def extract_key_points(self, text: str, max_slides: int = 5) -> List[Dict[str, Any]]:
        """
        Extract key points from text and organize them into slides.
        
        Args:
            text: Raw text to analyze
            max_slides: Maximum number of slides to generate
            
        Returns:
            List of slide dictionaries with title and bullets
        """
        prompt = f"""
        Analyze the following text and extract key points to create {max_slides} presentation slides.
        
        For each slide, provide:
        1. A clear, concise title (max 8 words)
        2. 3-5 bullet points that are:
           - Complete sentences
           - Key facts or insights
           - Easy to understand
           - Directly relevant to the slide topic
        3. A suggested layout from these options:
           - "title": Simple title slide (minimal content)
           - "title-bullets": Title with bullet points
           - "two-col": Two-column layout for comparisons or lists
           - "image-left": Content with image on the left
           - "image-right": Content with image on the right
        
        Choose the layout that best fits the slide's content and purpose:
        - Use "title" for simple, impactful statements
        - Use "title-bullets" for informational content with key points
        - Use "two-col" for comparisons, pros/cons, or structured lists
        - Use "image-left" for technical concepts, processes, or architecture
        - Use "image-right" for results, outcomes, or visual data
        
        Format your response as JSON with this structure:
        {{
            "slides": [
                {{
                    "title": "Slide Title",
                    "bullets": [
                        "First key point",
                        "Second key point",
                        "Third key point"
                    ],
                    "suggested_layout": "title-bullets"
                }}
            ]
        }}
        
        Text to analyze:
        {text}
        """
        
        messages = [
            {"role": "system", "content": "You are an expert presentation designer who creates clear, engaging slides from any text content. You excel at choosing the most appropriate layout for each slide based on its content and purpose. Always respond with valid JSON and include the suggested_layout for each slide."},
            {"role": "user", "content": prompt}
        ]
        
        try:
            import json
            
            response = self.client.chat.completions.create(
                model="gpt-5-chat-latest",  # Working GPT-5 variant
                messages=messages,
                max_completion_tokens=1500,  # GPT-5 uses max_completion_tokens instead of max_tokens
                temperature=1.0  # GPT-5 only supports default temperature of 1
            )
            
            # Parse the JSON response
            content = response.choices[0].message.content.strip()
            
            # Remove markdown code blocks if present
            if content.startswith('```json'):
                content = content[7:]  # Remove ```json
            if content.startswith('```'):
                content = content[3:]   # Remove ```
            if content.endswith('```'):
                content = content[:-3]  # Remove trailing ```
            
            content = content.strip()
            result = json.loads(content)
            return result.get("slides", [])
            
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            return self._fallback_parse(response.choices[0].message.content)
        except Exception as e:
            print(f"Error calling OpenAI API: {e}")
            return []
    
    def _fallback_parse(self, content: str) -> List[Dict[str, Any]]:
        """
        Fallback parser for when JSON parsing fails.
        """
        slides = []
        lines = content.split('\n')
        current_slide = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Look for slide titles (usually marked with numbers or dashes)
            if (line.startswith(('Slide', '##', '**')) or 
                (len(line) < 50 and not line.startswith('-') and not line.startswith('•'))):
                if current_slide:
                    slides.append(current_slide)
                current_slide = {
                    "title": line.replace('**', '').replace('##', '').strip(),
                    "bullets": []
                }
            elif line.startswith(('-', '•', '*')) and current_slide:
                bullet = line[1:].strip()
                if bullet:
                    current_slide["bullets"].append(bullet)
        
        if current_slide:
            slides.append(current_slide)
        
        return slides
    
    def create_slides(self, text: str, max_slides: int = 5) -> Dict[str, Any]:
        """
        Create a complete slide presentation from text.
        
        Args:
            text: Raw text to analyze
            max_slides: Maximum number of slides to generate
            
        Returns:
            Dictionary containing slides and metadata
        """
        slides = self.extract_key_points(text, max_slides)
        
        return {
            "title": "Generated Presentation",
            "total_slides": len(slides),
            "slides": slides,
            "summary": f"Generated {len(slides)} slides from the provided text."
        }
    
    def export_to_markdown(self, presentation: Dict[str, Any], filename: str = "presentation.md"):
        """
        Export presentation to markdown file.
        
        Args:
            presentation: Presentation data from create_slides()
            filename: Output filename
        """
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(f"# {presentation['title']}\n\n")
            
            for i, slide in enumerate(presentation['slides'], 1):
                f.write(f"## Slide {i}: {slide['title']}\n\n")
                for bullet in slide['bullets']:
                    f.write(f"- {bullet}\n")
                f.write("\n")
        
        print(f"Presentation exported to {filename}")
    
    def export_to_json(self, presentation: Dict[str, Any], filename: str = "presentation.json"):
        """
        Export presentation to JSON file.
        
        Args:
            presentation: Presentation data from create_slides()
            filename: Output filename
        """
        import json
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(presentation, f, indent=2, ensure_ascii=False)
        
        print(f"Presentation data exported to {filename}")
    
    def export_slides_data(self, presentation: Dict[str, Any], filename: str = "slides_data.json"):
        """
        Export just the slides data (titles and bullets) to JSON.
        
        Args:
            presentation: Presentation data from create_slides()
            filename: Output filename
        """
        import json
        import os
        
        # Ensure the directory exists
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        
        slides_data = {
            "slides": presentation['slides'],
            "metadata": {
                "total_slides": presentation['total_slides'],
                "generated_at": presentation.get('generated_at', ''),
                "model_used": "gpt-5-chat-latest"
            }
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(slides_data, f, indent=2, ensure_ascii=False)
        
        print(f"Slides data exported to {filename}")
    
    def generate_presentation_title(self, text: str) -> str:
        """
        Generate a presentation title based on the text content.
        
        Args:
            text: Raw text to analyze
            
        Returns:
            Generated presentation title
        """
        prompt = f"""
        Analyze the following text and generate a compelling, concise presentation title.
        
        The title should:
        1. Be 3-8 words long
        2. Capture the main theme or topic
        3. Be engaging and professional
        4. Work well as a presentation title
        
        Respond with just the title, no quotes or additional text.
        
        Text to analyze:
        {text}
        """
        
        messages = [
            {"role": "system", "content": "You are an expert presentation designer who creates compelling titles. Always respond with just the title, no quotes or additional formatting."},
            {"role": "user", "content": prompt}
        ]
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-5-chat-latest",
                messages=messages,
                max_completion_tokens=50,
                temperature=0.7
            )
            
            title = response.choices[0].message.content.strip()
            # Remove quotes if present
            title = title.strip('"\'')
            return title
            
        except Exception as e:
            print(f"Error generating title: {e}")
            return "Generated Presentation"
    
    def create_deck_format(self, text: str, max_slides: int = 5, title: str = None) -> Dict[str, Any]:
        """
        Create a deck format presentation directly from text.
        
        Args:
            text: Raw text to analyze
            max_slides: Maximum number of slides to generate (will be 6 total: 1 title + 5 content)
            title: Optional custom title for the presentation
            
        Returns:
            Dictionary in deck format with meta and slides
        """
        # Generate title if not provided
        if not title:
            title = self.generate_presentation_title(text)
        
        # Extract content slides (max_slides will be content slides, not including title slide)
        slides = self.extract_key_points(text, max_slides)
        
        # Create the deck structure
        deck = {
            "meta": {
                "title": title,
                "theme": "light",
                "total_slides": len(slides) + 1,  # +1 for title slide
                "generated_at": "",
                "model_used": "gpt-5-chat-latest"
            },
            "slides": []
        }
        
        # Add title slide as the first slide
        title_slide = {
            "layout": "title",
            "title": title,
            "notes": "Set the tone and highlight the main topic upfront.",
        }
        deck["slides"].append(title_slide)
        
        # Convert each content slide to deck format
        for i, slide in enumerate(slides):
            # Use LLM-suggested layout
            layout = slide.get('suggested_layout', 'title-bullets')  # Default fallback
            
            deck_slide = {
                "layout": layout,
                "title": slide.get('title', ''),
                "notes": self._generate_slide_notes(slide, i + 1),
            }
            
            # Add bullets if they exist
            if slide.get('bullets'):
                deck_slide["bullets"] = slide['bullets']
            
            # Add media if applicable
            if layout in ['image-left', 'image-right', 'image-center']:
                deck_slide["media"] = [
                    {
                        "kind": "image",
                        "url": "https://placehold.co/800x600/png",
                        "alt": f"Slide {i+2} image"  # +2 because title slide is slide 1
                    }
                ]
            
            deck["slides"].append(deck_slide)
        
        return deck
    
    def _generate_slide_notes(self, slide: Dict[str, Any], slide_index: int) -> str:
        """
        Generate speaker notes for a slide.
        
        Args:
            slide: Slide data dictionary
            slide_index: Index of the slide (0-based)
            
        Returns:
            Speaker notes string
        """
        title = slide.get('title', '')
        bullets = slide.get('bullets', [])
        
        # Generate contextual notes based on slide content
        if slide_index == 0:
            return "Set the tone and highlight the main topic upfront."
        elif 'agenda' in title.lower() or 'overview' in title.lower():
            return "Keep it short and give the audience a clear roadmap."
        elif 'problem' in title.lower() or 'challenge' in title.lower():
            return "These are the key challenges we need to address."
        elif 'solution' in title.lower() or 'approach' in title.lower():
            return "Here's how we solve the identified problems."
        elif 'architecture' in title.lower() or 'design' in title.lower():
            return "This is the technical foundation of our approach."
        elif 'performance' in title.lower() or 'results' in title.lower():
            return "These are the measurable outcomes and benefits."
        else:
            return f"Key points about {title.lower()}."
    
    def export_deck_format(self, deck: Dict[str, Any], filename: str = "deck_data.json"):
        """
        Export deck format data to JSON file.
        
        Args:
            deck: Deck format data from create_deck_format()
            filename: Output filename
        """
        import json
        import os
        
        # Ensure the directory exists
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(deck, f, indent=2, ensure_ascii=False)
        
        print(f"Deck format data exported to {filename}")
    
    def print_slides(self, presentation: Dict[str, Any]):
        """
        Print slides to console in a formatted way.
        
        Args:
            presentation: Presentation data from create_slides()
        """
        print(f"\n🎯 {presentation['title']}")
        print("=" * 50)
        
        for i, slide in enumerate(presentation['slides'], 1):
            print(f"\n📊 Slide {i}: {slide['title']}")
            print("-" * 30)
            for bullet in slide['bullets']:
                print(f"• {bullet}")
        
        print(f"\n📊 Summary: {presentation['summary']}")


def main():
    """
    Example usage of Analyzer
    """
    # Load environment variables from .env file
    load_dotenv()
    
    # Example text
    sample_text = """
    The Future of Remote Work: Trends and Implications
    
    Remote work has transformed the modern workplace, accelerated by the global pandemic. 
    Companies worldwide have adopted hybrid and fully remote models, fundamentally changing 
    how we think about productivity, collaboration, and work-life balance.
    
    Key statistics show that 42% of the U.S. workforce now works remotely full-time, 
    while 26% work in a hybrid model. This shift has created both opportunities and 
    challenges for organizations worldwide.
    
    Technology has been the enabler of this transformation. Cloud-based collaboration 
    tools, video conferencing platforms, and project management software have become 
    essential infrastructure. Companies invest an average of $2,000 per employee in 
    remote work technology annually.
    
    However, challenges remain. Traditional performance metrics don't translate well to 
    remote work. Companies are adopting new evaluation methods focused on outcomes rather 
    than hours worked. The real estate industry is adapting, with office spaces being 
    redesigned for collaboration rather than individual work.
    
    Looking ahead, the future of work will likely be hybrid. Organizations are 
    experimenting with flexible schedules, virtual reality meeting spaces, and 
    advanced cybersecurity measures to support distributed teams.
    """
    
    try:
        # Initialize Analyzer
        analyzer = Analyzer()
        
        # Create presentation in deck format (will generate title automatically)
        deck = analyzer.create_deck_format(sample_text, max_slides=5)
        
        # Print to console
        print(f"\n🎯 {deck['meta']['title']}")
        print("=" * 50)
        
        for i, slide in enumerate(deck['slides'], 1):
            print(f"\n📊 Slide {i}: {slide['title']} (layout: {slide['layout']})")
            print("-" * 30)
            for bullet in slide.get('bullets', []):
                print(f"• {bullet}")
            print(f"Notes: {slide['notes']}")
        
        # Export deck format to JSON
        analyzer.export_deck_format(deck, "data/deck_format_data.json")
        
    except ValueError as e:
        print(f"Error: {e}")
        print("Please set your OpenAI API key as an environment variable:")
        print("export OPENAI_API_KEY='your-api-key-here'")
    except Exception as e:
        print(f"An error occurred: {e}")


if __name__ == "__main__":
    main()
