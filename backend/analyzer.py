"""Analyzer - Simple text to slides converter using OpenAI API."""

import base64
import copy
import os
from urllib.parse import quote_plus
from typing import List, Dict, Any, Optional, Tuple

import requests
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

CURATED_IMAGE_LIBRARY = [
    {
        "tags": {"coding", "interview", "developer", "programming"},
        "url": "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=80",
        "alt": "Candidate working through a coding interview"
    },
    {
        "tags": {"analytics", "data", "dashboard", "statistics"},
        "url": "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1600&q=80",
        "alt": "Data analytics dashboard"
    },
    {
        "tags": {"algorithm", "whiteboard", "teamwork", "brainstorm"},
        "url": "https://images.unsplash.com/photo-1527254059244-3b7990fda2e0?auto=format&fit=crop&w=1600&q=80",
        "alt": "Team collaborating on a whiteboard"
    },
    {
        "tags": {"practice", "laptop", "workspace", "preparation"},
        "url": "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=1600&q=80",
        "alt": "Engineer practicing on laptop"
    },
    {
        "tags": {"roadmap", "planning", "milestones", "timeline"},
        "url": "https://images.unsplash.com/photo-1454165205744-3b78555e5572?auto=format&fit=crop&w=1600&q=80",
        "alt": "Strategic project roadmap"
    },
    {
        "tags": {"communication", "soft", "skills", "presentation"},
        "url": "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=1600&q=80",
        "alt": "Professional presenting to panel"
    },
    {
        "tags": {"problem", "solving", "puzzle", "logic"},
        "url": "https://images.unsplash.com/photo-1517433456452-f9633a875f6f?auto=format&fit=crop&w=1600&q=80",
        "alt": "Person solving logic puzzle"
    },
]

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
        self.unsplash_access_key = os.getenv("UNSPLASH_ACCESS_KEY")
    
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
        2. 3-5 bullet points (depends on the layout you choose) that are:
           - Complete sentences but should be short and concise
           - Key facts or insights
           - Easy to understand
           - Directly relevant to the slide topic
        3. A suggested layout from these options:
           - "title": Simple title slide (minimal content)
           - "title-bullets": Title with bullet points (PREFERRED for most content)
           - "two-col": Two-column layout for comparisons or lists
           - "quote": Quote slide with author attribution
           - "stats": Statistics slide with key metrics and data points
           - "image-left": Content with image on the left (use sparingly)
           - "image-right": Content with image on the right (use sparingly)
        4. Optional animations to make the slide more engaging:
           - "title": Animation for the slide title
           - "bullets": Animation for bullet points
           - "image": Animation for images (if applicable)
           - "background": Animation for background elements
        
        Choose the layout that best fits the slide's content and purpose:
        - Use "title" for simple, impactful statements or introductions
        - Use "title-bullets" for informational content with key points
        - Use "two-col" for comparisons, pros/cons, or structured lists (when you have two distinct categories)
        - Use "quote" when the content contains important quotes, testimonials, or key insights that should be highlighted
        - Use "stats" when the content has numerical data, metrics, achievements, or performance indicators
        - Use "image-left" for technical concepts, processes, or architecture that benefit from visual support
        - Use "image-right" for results, outcomes, or visual data that benefits from visual support
        
        IMPORTANT LAYOUT RULES:
        - Choose the layout that best matches the content type. If content has numbers/statistics, use "stats". If it has quotes, use "quote". If it compares two things, use "two-col". Use variety to create an engaging presentation.
        - LAYOUT RESTRICTIONS: You CANNOT use the same layout twice for these layouts: "stats", "quote", "two-col", "image-left", "image-right"
        - EXCEPTION: You CAN use "title-bullets" layout multiple times throughout the presentation as it's the default content layout
        - If you need to use a restricted layout type again, choose the next best alternative (e.g., if you already used "stats", use "title-bullets" for additional numerical content)
        
        Examples of when to use each layout:
        - "stats": "42% increase in sales", "10M+ users", "95% satisfaction rate"
        - "quote": "Customer testimonials", "Expert opinions", "Key insights"
        - "two-col": "Pros vs Cons", "Before vs After", "Traditional vs Modern"
        - "title-bullets": General information, key points, explanations

        Available animation types:
        - "fadeIn": Smooth fade-in effect
        - "slideInLeft": Slide in from the left
        - "slideInRight": Slide in from the right
        - "slideInUp": Slide in from the bottom
        - "slideInDown": Slide in from the top
        - "zoomIn": Scale up from small to normal size
        - "rotateIn": Rotate in with fade
        - "bounceIn": Bouncy entrance effect
        - "flipInX": Flip in on X-axis
        - "flipInY": Flip in on Y-axis
        - "typewriter": Text appears character by character
        - "reveal": Progressive reveal effect
        - "stagger": Sequential animation for multiple items

        Animation configuration:
        - type: Animation type from the list above
        - duration: Duration in milliseconds (300-2000)
        - delay: Delay before animation starts in milliseconds (0-1000)
        - easing: "easeInOut", "easeOut", "easeIn", "bounce", "elastic"
        - stagger: For staggered animations, delay between items (100-300)

        Choose animations that enhance the content:
        - Use "zoomIn" or "bounceIn" for impactful title slides
        - Use "slideInLeft/Right" for content that flows naturally
        - Use "typewriter" for quotes or important text
        - Use "stagger" for bullet points to reveal them sequentially
        - Use "fadeIn" for subtle, professional effects

        note that if you use the image-left or image-right, the text should be shorter, to not make an overflow.
        For any slide that would benefit from a visual (especially image-left or image-right layouts), include 2-5 concise "image_keywords"
        that capture the visual concept of the slide. Focus on nouns or short phrases (no punctuation, no quotes).
        
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
                    "suggested_layout": "title-bullets",
                    "image_keywords": ["keyword1", "keyword2"],
                    "animations": {{
                        "title": {{
                            "type": "zoomIn",
                            "duration": 800,
                            "delay": 0,
                            "easing": "bounce"
                        }},
                        "bullets": {{
                            "type": "stagger",
                            "duration": 400,
                            "delay": 300,
                            "easing": "easeOut",
                            "stagger": 150
                        }}
                    }}
                }}
            ]
        }}
        
        For different layouts, use these specific structures:
        
        Quote slide (suggested_layout: "quote"):
        {{
            "title": "Quote Title",
            "quote": "The actual quote text here",
            "author": "Quote Author Name",
            "suggested_layout": "quote",
            "animations": {{ ... }}
        }}
        
        Stats slide (suggested_layout: "stats"):
        {{
            "title": "Statistics Title",
            "stats": [
                {{"label": "Metric 1", "value": "Value 1", "description": "Optional description"}},
                {{"label": "Metric 2", "value": "Value 2", "description": "Optional description"}},
                {{"label": "Metric 3", "value": "Value 3", "description": "Optional description"}},
                {{"label": "Metric 4", "value": "Value 4", "description": "Optional description"}}
            ],
            "suggested_layout": "stats",
            "animations": {{ ... }}
        }}
        
        Two-column slide (suggested_layout: "two-col"):
        {{
            "title": "Comparison Title",
            "comparison": {{
                "left": {{"title": "Left Column Title", "items": ["Item 1", "Item 2", "Item 3"]}},
                "right": {{"title": "Right Column Title", "items": ["Item 1", "Item 2", "Item 3"]}}
            }},
            "suggested_layout": "two-col",
            "animations": {{ ... }}
        }}
        
        Text to analyze:
        {text}
        """
        
        messages = [
            {"role": "system", "content": "You are an expert presentation designer who creates clear, engaging slides from any text content. You excel at choosing the most appropriate layout and animations for each slide based on its content and purpose. Choose layouts that best match the content type - use 'stats' for numerical data, 'quote' for quotes, 'two-col' for comparisons, and 'title-bullets' for general information. IMPORTANT: You must follow strict layout validation rules - you cannot use the same layout twice for 'stats', 'quote', 'two-col', 'image-left', or 'image-right' layouts, but you can use 'title-bullets' multiple times. Always respond with valid JSON and include the suggested_layout and animations for each slide."},
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

    def _extract_image_keywords(self, slide: Dict[str, Any]) -> List[str]:
        """Gather a concise keyword list for image lookup."""
        keywords = slide.get("image_keywords")
        if isinstance(keywords, list):
            cleaned = [str(kw).strip() for kw in keywords if str(kw).strip()]
            if cleaned:
                return cleaned

        title = slide.get("title", "").strip()
        bullets = slide.get("bullets") or []

        fallback = []
        if title:
            fallback.extend(title.split())
        for bullet in bullets[:3]:
            fallback.extend(bullet.split())

        seen = set()
        deduped: List[str] = []
        for word in fallback:
            cleaned = "".join(ch for ch in word if ch.isalnum())
            key = cleaned.lower()
            if key and key not in seen:
                seen.add(key)
                deduped.append(cleaned)
            if len(deduped) >= 5:
                break
        return deduped

    def _build_slide_image_media(
        self, slide: Dict[str, Any], slide_number: int
    ) -> Optional[Dict[str, Any]]:
        """Construct a media descriptor using external stock imagery by keyword."""

        keywords = self._extract_image_keywords(slide)
        if not keywords:
            return None

        clean_keywords = [kw for kw in keywords if kw]
        limited_keywords = clean_keywords[:3] or clean_keywords
        if not limited_keywords:
            return None

        alt_text = slide.get("title") or f"Slide {slide_number} illustration"

        curated = self._match_curated_image(limited_keywords)
        if curated:
            image_base64, source_url = self._download_image_as_base64(curated["url"])
            alt_text = curated.get("alt") or alt_text
        else:
            image_base64, source_url = self._fetch_unsplash_api_image(limited_keywords)

        if curated and not image_base64:
            # If curated download failed, drop back to keyword flow
            curated = None
            image_base64, source_url = self._fetch_unsplash_api_image(limited_keywords)

        if not image_base64:
            candidate_queries = []
            joined = ",".join(quote_plus(kw).replace("+", "-") for kw in limited_keywords)
            if joined:
                candidate_queries.append(joined)
            candidate_queries.extend(
                quote_plus(kw).replace("+", "-") for kw in limited_keywords
            )

            for query in candidate_queries:
                url = f"https://source.unsplash.com/1600x900/?{query}"
                image_base64, source_url = self._download_image_as_base64(url)
                if image_base64:
                    break

        if not image_base64:
            fallback_seed = quote_plus(limited_keywords[0]).replace("+", "-") or "presentation"
            fallback_url = f"https://picsum.photos/seed/{fallback_seed}/1280/720"
            image_base64, source_url = self._download_image_as_base64(fallback_url)

        if not image_base64:
            return None

        data_url = f"data:image/jpeg;base64,{image_base64}"
        media = {
            "kind": "image",
            "url": data_url,
            "alt": alt_text,
        }
        if source_url:
            media["source_url"] = source_url
        return media

    def _fetch_unsplash_api_image(self, keywords: List[str]) -> Tuple[Optional[str], Optional[str]]:
        if not self.unsplash_access_key:
            return None, None

        query = " ".join(keywords)
        headers = {
            "Authorization": f"Client-ID {self.unsplash_access_key}",
            "Accept-Version": "v1",
        }
        params = {
            "query": query or "presentation",
            "orientation": "landscape",
            "content_filter": "high",
        }

        try:
            response = requests.get(
                "https://api.unsplash.com/photos/random",
                headers=headers,
                params=params,
                timeout=10,
            )
            response.raise_for_status()
            data = response.json()
            image_url = (
                data.get("urls", {}).get("regular")
                or data.get("urls", {}).get("full")
                or data.get("urls", {}).get("raw")
            )
            if not image_url:
                return None, None
            return self._download_image_as_base64(image_url)
        except Exception as exc:
            print(f"⚠️ Unsplash API lookup failed: {exc}")
            return None, None

    def _download_image_as_base64(self, url: str) -> Tuple[Optional[str], Optional[str]]:
        try:
            response = requests.get(
                url,
                timeout=10,
                headers={
                    "User-Agent": "LovaSlideBot/1.0 (+https://lovaslide.app)",
                    "Accept": "image/*",
                },
                allow_redirects=True,
            )
            response.raise_for_status()
            return base64.b64encode(response.content).decode("utf-8"), response.url
        except Exception as exc:
            print(f"⚠️ Image download failed for {url}: {exc}")
            return None, None

    def _match_curated_image(self, keywords: List[str]) -> Optional[Dict[str, Any]]:
        normalized = {kw.lower() for kw in keywords}
        best_entry = None
        best_score = 0
        for entry in CURATED_IMAGE_LIBRARY:
            score = len(normalized & entry["tags"])
            if score > best_score:
                best_entry = entry
                best_score = score
        return best_entry if best_score > 0 else None

    def _ensure_image_keywords(self, slide: Dict[str, Any]) -> None:
        if slide.get("image_keywords"):
            return

        title = slide.get("title", "")
        bullets = slide.get("bullets") or []

        prompt = (
            "Generate 3 short, specific visual keywords (each 1-3 words) that describe imagery "
            "supporting the slide below. Focus on concrete nouns and avoid generic words like "
            "'business' or 'presentation'. Respond with JSON: {\"image_keywords\": [\"keyword1\", "
            "\"keyword2\", \"keyword3\"]}."
        )

        slide_description = "Title: " + title + "\nBullets:\n" + "\n".join(
            f"- {b}" for b in bullets
        )

        try:
            response = self.client.chat.completions.create(
                model="gpt-5-chat-latest",
                messages=[
                    {
                        "role": "system",
                        "content": "You provide concise visual keywords for presentation slides.",
                    },
                    {"role": "user", "content": prompt + "\n\n" + slide_description},
                ],
                max_completion_tokens=200,
            )
            content = response.choices[0].message.content.strip()
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]

            import json

            data = json.loads(content)
            keywords = data.get("image_keywords")
            if isinstance(keywords, list) and keywords:
                slide["image_keywords"] = [
                    str(kw).strip() for kw in keywords if str(kw).strip()
                ][:4]
                return
        except Exception as exc:
            print(f"⚠️ Failed to fetch image keywords via LLM: {exc}")

        fallback = self._heuristic_keywords(title, bullets)
        if fallback:
            slide["image_keywords"] = fallback

    def _heuristic_keywords(self, title: str, bullets: List[str]) -> List[str]:
        import re

        stopwords = {
            "the",
            "a",
            "an",
            "to",
            "for",
            "and",
            "with",
            "your",
            "our",
            "data",
            "coding",
            "interview",
            "structured",
            "slide",
            "presentation",
            "overview",
            "summary",
            "approach",
            "practice",
            "key",
            "points",
        }

        words = []
        text = " ".join([title] + bullets[:2])
        for token in re.split(r"[^a-zA-Z0-9]+", text):
            token = token.strip()
            if not token:
                continue
            lowered = token.lower()
            if lowered in stopwords or len(token) <= 3:
                continue
            words.append(token)

        seen = set()
        keywords = []
        for word in words:
            lowered = word.lower()
            if lowered not in seen:
                seen.add(lowered)
                keywords.append(word)
            if len(keywords) >= 4:
                break
        return keywords

    def _prepare_deck_for_prompt(self, deck: Dict[str, Any]) -> Dict[str, Any]:
        sanitized = copy.deepcopy(deck)
        for slide in sanitized.get("slides", []):
            media_items = slide.get("media")
            if not media_items:
                continue
            for media in media_items:
                url = media.get("url")
                if isinstance(url, str) and url.startswith("data:image"):
                    placeholder = media.get("source_url") or "[inline image omitted]"
                    media["url"] = placeholder
        return sanitized

    def _restore_media_placeholders(self, original_slide: Dict[str, Any], updated_slide: Dict[str, Any]) -> None:
        original_media = original_slide.get("media")
        if not original_media:
            return

        if "media" not in updated_slide:
            updated_slide["media"] = copy.deepcopy(original_media)
            return

        updated_media = updated_slide.get("media")
        if updated_media is None:
            updated_slide["media"] = copy.deepcopy(original_media)
            return

        if isinstance(updated_media, list) and not updated_media:
            return

        if not isinstance(updated_media, list):
            updated_slide["media"] = copy.deepcopy(original_media)
            return

        restored_media = []
        for idx, item in enumerate(updated_media):
            if not isinstance(item, dict):
                restored_media.append(item)
                continue

            url = item.get("url") or ""
            source = original_media[min(idx, len(original_media) - 1)]
            source_url = source.get("source_url")
            if (
                url in {"[inline image omitted]", "[image omitted]", "[removed]"}
                or (source_url and url == source_url)
            ):
                restored_media.append(copy.deepcopy(source))
            else:
                restored_media.append(item)

        updated_slide["media"] = restored_media

    def _restore_media_placeholders_for_deck(self, original_deck: Dict[str, Any], updated_deck: Dict[str, Any]) -> None:
        original_slides = original_deck.get("slides", [])
        updated_slides = updated_deck.get("slides", [])

        for idx, updated_slide in enumerate(updated_slides):
            if idx < len(original_slides):
                self._restore_media_placeholders(original_slides[idx], updated_slide)
            self._ensure_image_keywords(updated_slide)
            self._ensure_image_animation(updated_slide)

    def _ensure_image_animation(self, slide: Dict[str, Any]) -> None:
        if not slide.get("media"):
            return
        slide.setdefault("animations", {})
        slide["animations"].setdefault(
            "image",
            {
                "type": "fadeIn",
                "duration": 600,
                "delay": 200,
                "easing": "easeOut",
            },
        )
    
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
        for slide in slides:
            self._ensure_image_keywords(slide)
            self._ensure_image_animation(slide)
        
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
            print(title)
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
        # Generate title
        title = self.generate_presentation_title(text)
        
        # Extract content slides (max_slides will be content slides, not including title slide)
        slides = self.extract_key_points(text, max_slides)
        for slide in slides:
            self._ensure_image_keywords(slide)
            self._ensure_image_animation(slide)
        
        # Create the deck structure with random theme selection
        import random
        available_themes = ["dark"]
        selected_theme = random.choice(available_themes)
        
        deck = {
            "meta": {
                "title": title,
                "theme": selected_theme,
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
            "animations": {
                "title": {
                    "type": "zoomIn",
                    "duration": 1000,
                    "delay": 0,
                    "easing": "bounce"
                },
                "background": {
                    "type": "fadeIn",
                    "duration": 800,
                    "delay": 0,
                    "easing": "easeOut"
                }
            }
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
            
            # Add content based on layout type
            if layout == "quote":
                if slide.get('quote'):
                    deck_slide["quote"] = slide['quote']
                if slide.get('author'):
                    deck_slide["author"] = slide['author']
            elif layout == "stats":
                if slide.get('stats'):
                    deck_slide["stats"] = slide['stats']
            elif layout == "two-col":
                if slide.get('comparison'):
                    deck_slide["comparison"] = slide['comparison']
            elif layout == "title-bullets":
                # Add bullets if they exist
                if slide.get('bullets'):
                    deck_slide["bullets"] = slide['bullets']
            else:
                # For other layouts, add bullets if they exist
                if slide.get('bullets'):
                    deck_slide["bullets"] = slide['bullets']
            
            # Handle media for image layouts only
            media_items = slide.get("media")
            if media_items:
                deck_slide["media"] = media_items
            elif layout in ["image-left", "image-right", "image-center"]:
                generated_media = self._build_slide_image_media(slide, i + 2)
                if generated_media:
                    deck_slide["media"] = [generated_media]
                else:
                    deck_slide["media"] = [
                        {
                            "kind": "image",
                            "url": "https://placehold.co/800x600/png",
                            "alt": f"Slide {i + 2} image",
                        }
                    ]
            
            # Add animations if provided by the LLM
            if slide.get('animations'):
                deck_slide["animations"] = slide['animations']

            if deck_slide.get("media"):
                self._ensure_image_animation(deck_slide)

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
    
    def edit_deck_with_note(self, deck: Dict[str, Any], note: str, slide_index: int = None) -> Dict[str, Any]:
        """
        Edit a deck based on user notes using ChatGPT API.
        
        Args:
            deck: The current deck JSON structure
            note: User's note describing what to change
            slide_index: Index of specific slide to edit (None for entire deck)
            
        Returns:
            Updated deck with changes applied
        """
        import json
        
        sanitized_deck = self._prepare_deck_for_prompt(deck)

        # Create a prompt for editing the deck
        if slide_index is not None:
            # Edit specific slide
            target_slide = deck['slides'][slide_index] if slide_index < len(deck['slides']) else None
            if not target_slide:
                raise ValueError(f"Slide index {slide_index} is out of range")
            sanitized_target = sanitized_deck['slides'][slide_index]
            
            # Check if the note is asking to add a new slide or multiple slides
            add_slide_keywords = [
                'add a new slide', 'add new slide', 'create a new slide', 'create new slide', 
                'add another slide', 'add slide', 'add slides', 'create slides', 'add more slides'
            ]
            is_adding_slide = any(keyword in note.lower() for keyword in add_slide_keywords)
            
            # Check for specific numbers of slides to add
            import re
            slide_count_match = re.search(r'add\s+(\d+)\s+slides?', note.lower())
            slides_to_add = 1
            if slide_count_match:
                slides_to_add = int(slide_count_match.group(1))
                is_adding_slide = True
            
            if is_adding_slide:
                # Handle adding slide(s) - return the complete deck with new slide(s) added
                slide_text = "slide" if slides_to_add == 1 else f"{slides_to_add} slides"
                prompt = f"""
                You are an expert presentation editor. I need you to add {slide_text} to the presentation based on the user's note.
                
                Current deck:
                {json.dumps(sanitized_deck, indent=2)}
                
                User's note: "{note}"
                
                Please add {slide_text} to the deck according to the user's request. The new slide(s) should be added to the slides array.
                Update the meta.total_slides count to reflect the new total.
                
                For each new slide, include:
                - layout: choose from "title", "title-bullets", "two-col", "quote", "stats", "image-left", "image-right"
                - title: appropriate title for the slide
                - bullets: relevant bullet points (if applicable)
                - notes: brief speaker notes
                - animations: optional animations to enhance the slide
                
                IMPORTANT LAYOUT RULES:
                - You CANNOT use the same layout twice for these layouts: "stats", "quote", "two-col", "image-left", "image-right"
                - EXCEPTION: You CAN use "title-bullets" layout multiple times throughout the presentation as it's the default content layout
                - If you need to use a restricted layout type again, choose the next best alternative (e.g., if you already used "stats", use "title-bullets" for additional numerical content)

                Available animation types:
                - "fadeIn": Smooth fade-in effect
                - "slideInLeft": Slide in from the left
                - "slideInRight": Slide in from the right
                - "slideInUp": Slide in from the bottom
                - "slideInDown": Slide in from the top
                - "zoomIn": Scale up from small to normal size
                - "rotateIn": Rotate in with fade
                - "bounceIn": Bouncy entrance effect
                - "flipInX": Flip in on X-axis
                - "flipInY": Flip in on Y-axis
                - "typewriter": Text appears character by character
                - "reveal": Progressive reveal effect
                - "stagger": Sequential animation for multiple items

                Animation configuration:
                - type: Animation type from the list above
                - duration: Duration in milliseconds (300-2000)
                - delay: Delay before animation starts in milliseconds (0-1000)
                - easing: "easeInOut", "easeOut", "easeIn", "bounce", "elastic"
                - stagger: For staggered animations, delay between items (100-300)

                note that if you use the image-left or image-right, the text should be shorter, to not make an overflow.
                
                Return the complete updated deck in the same JSON format. Maintain the structure:
                - meta: title, theme, total_slides (updated), etc.
                - slides: array of slide objects with the new slide(s) added
                
                Respond with only the updated deck JSON, no additional text or explanations.
                """
            else:
                # Edit existing slide
                prompt = f"""
                You are an expert presentation editor. I need you to edit a specific slide based on the user's note.
                
                Current slide (index {slide_index}):
                {json.dumps(sanitized_target, indent=2)}
                
                User's note: "{note}"
                
                Please edit this slide according to the user's request. You can:
                - Modify the title
                - Add, remove, or edit bullet points
                - Change the layout if appropriate
                - Add or modify notes
                - Add media if relevant
                - Add or modify animations to enhance the slide
                
                IMPORTANT LAYOUT RULES:
                - You CANNOT use the same layout twice for these layouts: "stats", "quote", "two-col", "image-left", "image-right"
                - EXCEPTION: You CAN use "title-bullets" layout multiple times throughout the presentation as it's the default content layout
                - If changing to a restricted layout type that's already used, choose the next best alternative
                
                Available animation types:
                - "fadeIn": Smooth fade-in effect
                - "slideInLeft": Slide in from the left
                - "slideInRight": Slide in from the right
                - "slideInUp": Slide in from the bottom
                - "slideInDown": Slide in from the top
                - "zoomIn": Scale up from small to normal size
                - "rotateIn": Rotate in with fade
                - "bounceIn": Bouncy entrance effect
                - "flipInX": Flip in on X-axis
                - "flipInY": Flip in on Y-axis
                - "typewriter": Text appears character by character
                - "reveal": Progressive reveal effect
                - "stagger": Sequential animation for multiple items

                Animation configuration:
                - type: Animation type from the list above
                - duration: Duration in milliseconds (300-2000)
                - delay: Delay before animation starts in milliseconds (0-1000)
                - easing: "easeInOut", "easeOut", "easeIn", "bounce", "elastic"
                - stagger: For staggered animations, delay between items (100-300)
                
                Return the updated slide in the same JSON format. Keep the structure consistent with the original deck format.
                
                Respond with only the updated slide JSON, no additional text or explanations.
                """
        else:
            # Edit entire deck
            prompt = f"""
            You are an expert presentation editor. I need you to edit a presentation deck based on the user's note.
            
            Current deck:
            {json.dumps(sanitized_deck, indent=2)}
            
            User's note: "{note}"
            
            Please edit the deck according to the user's request. You can:
            - Modify slide titles and content
            - Add, remove, or edit bullet points
            - Change layouts if appropriate
            - Add or remove slides
            - Modify the presentation title
            - Add or modify notes
            - Change the theme (light/dark) for all slides
            - Apply consistent styling across all slides
            - Update global presentation settings
            - Add or modify animations to enhance slides
            
            IMPORTANT LAYOUT RULES:
            - You CANNOT use the same layout twice for these layouts: "stats", "quote", "two-col", "image-left", "image-right"
            - EXCEPTION: You CAN use "title-bullets" layout multiple times throughout the presentation as it's the default content layout
            - If you need to use a restricted layout type again, choose the next best alternative
            
            Available animation types:
            - "fadeIn": Smooth fade-in effect
            - "slideInLeft": Slide in from the left
            - "slideInRight": Slide in from the right
            - "slideInUp": Slide in from the bottom
            - "slideInDown": Slide in from the top
            - "zoomIn": Scale up from small to normal size
            - "rotateIn": Rotate in with fade
            - "bounceIn": Bouncy entrance effect
            - "flipInX": Flip in on X-axis
            - "flipInY": Flip in on Y-axis
            - "typewriter": Text appears character by character
            - "reveal": Progressive reveal effect
            - "stagger": Sequential animation for multiple items

            Animation configuration:
            - type: Animation type from the list above
            - duration: Duration in milliseconds (300-2000)
            - delay: Delay before animation starts in milliseconds (0-1000)
            - easing: "easeInOut", "easeOut", "easeIn", "bounce", "elastic"
            - stagger: For staggered animations, delay between items (100-300)
            
            For theme changes:
            - If user asks to change theme to "light" or "dark", update meta.theme accordingly
            - Ensure all slides work well with the new theme
            
            Return the complete updated deck in the same JSON format. Maintain the structure:
            - meta: title, theme, total_slides, etc.
            - slides: array of slide objects with layout, title, bullets, notes, etc.
            
            Respond with only the updated deck JSON, no additional text or explanations.
            """
        
        messages = [
            {"role": "system", "content": "You are an expert presentation editor who understands deck JSON format and can make precise edits based on user feedback. You can add animations to enhance slide presentations. IMPORTANT: You must follow strict layout validation rules - you cannot use the same layout twice for 'stats', 'quote', 'two-col', 'image-left', or 'image-right' layouts, but you can use 'title-bullets' multiple times. Always respond with valid JSON only."},
            {"role": "user", "content": prompt}
        ]
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-5-chat-latest",
                messages=messages,
                max_completion_tokens=2000,
                temperature=0.7
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
            
            if slide_index is not None:
                # Check if we're adding a new slide or editing existing one
                add_slide_keywords = [
                    'add a new slide', 'add new slide', 'create a new slide', 'create new slide', 
                    'add another slide', 'add slide', 'add slides', 'create slides', 'add more slides'
                ]
                is_adding_slide = any(keyword in note.lower() for keyword in add_slide_keywords)
                
                # Check for specific numbers of slides to add
                slide_count_match = re.search(r'add\s+(\d+)\s+slides?', note.lower())
                if slide_count_match:
                    is_adding_slide = True
                
                if is_adding_slide:
                    # Return the complete updated deck (new slide was added)
                    self._restore_media_placeholders_for_deck(deck, result)
                    return result
                else:
                    # Update specific slide in the deck
                    updated_deck = copy.deepcopy(deck)
                    updated_slide = copy.deepcopy(result)
                    self._restore_media_placeholders(deck['slides'][slide_index], updated_slide)
                    self._ensure_image_keywords(updated_slide)
                    self._ensure_image_animation(updated_slide)
                    updated_deck['slides'][slide_index] = updated_slide
                    return updated_deck
            else:
                # Return the complete updated deck
                self._restore_media_placeholders_for_deck(deck, result)
                for slide in result.get('slides', []):
                    self._ensure_image_keywords(slide)
                return result
            
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            print(f"Response content: {content}")
            # Fallback: return original deck with error message
            return deck
        except Exception as e:
            print(f"Error calling OpenAI API for deck editing: {e}")
            # Fallback: return original deck
            return deck

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
