from docx import Document  # from python-docx
import fitz
import time
from pathlib import Path
import re

# TO DO:
# figure out how to ai generate slides, probably multiple ways but make the best one

# docx
def extract_docx(file_path):
    """Return all text from a .docx file as one string."""
    doc = Document(file_path)
    text = []
    for paragraph in doc.paragraphs:
        text.append(paragraph.text)
    return " ".join(text)

def extract_pdf(file_path):
    """Return all text from a PDF file as one string."""
    text = ""
    with fitz.open(file_path) as pdf:
        for page in pdf:                      # iterate over pages
            text += page.get_text() + "\n"    # extract text from each page
    return text.replace('\n', "")

def extract_txt(file_path):
    """Return all text from a .txt file as one string."""
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        text = f.read()
    return text.replace('\n', "")

def extract_markdown(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        text = f.read()
    
    # Remove markdown formatting (basic)
    text = re.sub(r'[#*`>\[\]\(\)_!-]', '', text)
    text = re.sub(r'\n{2,}', '\n', text)  # Collapse multiple newlines
    return text

def extract_folder(folder_path):
    """Return a list of all files (full paths) in a folder."""
    folder = Path(folder_path)
    files = [str(f) for f in folder.iterdir() if f.is_file()]

    content = {}
    
    for file in files:
        if file.endswith(".txt"):
            text = extract_txt(file)
        elif file.endswith(".pdf"):
            text = extract_pdf(file)
        elif file.endswith(".docx"):
            text = extract_docx(file)
        elif file.endswith(".md"):
            text = extract_markdown(file)
            
        content[file] = text

    return content

# Test in content folders:
if __name__ == "__main__":
    t0 = time.time()
    folder = r"C:\Users\danny\Documents\GitHub\lovaslide\test_docs"
    files = extract_folder(folder)
    print(files)
    t1 = time.time()
    print(f"{len(files)} documents extracted in {t1 - t0:.3f}s")