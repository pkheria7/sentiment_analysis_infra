"""
Indian Language Transliteration and Translation System
Supports: Hindi, English, Tulu, Kannada, Tamil, Telugu, Marathi, Konkani, 
          Awadhi, Bhojpuri, Maithili, Magadhi, Bengali, Assamese, Nepali, 
          Kashmiri, Bodo and other Indian languages
          
Handles:
- Auto language detection
- Mixed scripts (local + Roman)
- Code-mixing with English
- Transliteration from local scripts
- Translation to English
"""

import re
from typing import Dict, Tuple, Optional
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, pipeline
import torch
from indic_transliteration import sanscript
from indic_transliteration.sanscript import transliterate


class IndianLanguageProcessor:
    """
    Processes Indian language text for transliteration and translation to English.
    Uses open-source models: IndicBART and AI4Bharat models.
    """
    
    def __init__(self):
        """Initialize the language processor with open-source models."""
        print("🚀 Initializing Indian Language Processor...")
        
        # Language detection patterns
        self.script_patterns = {
            'hindi': re.compile(r'[\u0900-\u097F]'),  # Devanagari
            'bengali': re.compile(r'[\u0980-\u09FF]'),  # Bengali
            'tamil': re.compile(r'[\u0B80-\u0BFF]'),  # Tamil
            'telugu': re.compile(r'[\u0C00-\u0C7F]'),  # Telugu
            'kannada': re.compile(r'[\u0C80-\u0CFF]'),  # Kannada
            'malayalam': re.compile(r'[\u0D00-\u0D7F]'),  # Malayalam
            'gujarati': re.compile(r'[\u0A80-\u0AFF]'),  # Gujarati
            'oriya': re.compile(r'[\u0B00-\u0B7F]'),  # Odia
            'punjabi': re.compile(r'[\u0A00-\u0A7F]'),  # Gurmukhi
            'assamese': re.compile(r'[\u0980-\u09FF]'),  # Same as Bengali
            'marathi': re.compile(r'[\u0900-\u097F]'),  # Devanagari
        }
        
        # Map Unicode ranges to Sanscript scheme names
        self.unicode_to_sanscript = {
            (0x0900, 0x097F): sanscript.DEVANAGARI,  # Hindi, Marathi, Konkani, etc.
            (0x0980, 0x09FF): sanscript.BENGALI,  # Bengali, Assamese
            (0x0B80, 0x0BFF): sanscript.TAMIL,
            (0x0C00, 0x0C7F): sanscript.TELUGU,
            (0x0C80, 0x0CFF): sanscript.KANNADA,
            (0x0D00, 0x0D7F): sanscript.MALAYALAM,
            (0x0A80, 0x0AFF): sanscript.GUJARATI,
            (0x0B00, 0x0B7F): sanscript.ORIYA,
            (0x0A00, 0x0A7F): sanscript.GURMUKHI,
        }
        
        # Device configuration with memory check
        if torch.cuda.is_available():
            # Check available GPU memory
            gpu_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)  # Convert to GB
            print(f"📱 GPU detected: {torch.cuda.get_device_name(0)}")
            print(f"💾 GPU memory: {gpu_memory:.2f} GB")
            
            # For GPUs with less than 6GB, use CPU (models are ~1-3GB)
            if gpu_memory < 6.0:
                print(f"⚠️  GPU memory is limited ({gpu_memory:.2f} GB)")
                print(f"🔄 Using CPU instead to avoid out-of-memory errors")
                self.device = "cpu"
            else:
                self.device = "cuda"
                print(f"✅ Using GPU")
        else:
            self.device = "cpu"
            print(f"📱 Using device: CPU")
        
        # Load translation model
        print("📥 Loading translation model...")
        
        # Use IndicBART - already downloaded
        print("   Using IndicBART (AI4Bharat)...")
        self.translation_model_name = "ai4bharat/IndicBARTSS"
        model_loaded = False
        
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(self.translation_model_name)
            self.model = AutoModelForSeq2SeqLM.from_pretrained(
                self.translation_model_name
            )
            
            # Try to load on device with CUDA error handling
            try:
                self.model = self.model.to(self.device)
                print("✅ IndicBART loaded successfully!")
                model_loaded = True
            except torch.cuda.OutOfMemoryError:
                print("⚠️  GPU out of memory for IndicBART")
                if self.device == "cuda":
                    print("🔄 Switching to CPU...")
                    self.device = "cpu"
                    torch.cuda.empty_cache()
                    self.model = self.model.to(self.device)
                    print("✅ IndicBART loaded on CPU")
                    model_loaded = True
                    
        except Exception as e:
            print(f"❌ Failed to load IndicBART: {e}")
            print("\nPlease check your installation or try:")
            print("  pip install --upgrade transformers torch")
            raise
        
        if not model_loaded:
            raise RuntimeError("Failed to load translation model")
        
        # IndicBART language codes for Indian languages
        self.indic_lang_codes = {
            'hindi': 'hi',
            'bengali': 'bn',
            'tamil': 'ta',
            'telugu': 'te',
            'kannada': 'kn',
            'malayalam': 'ml',
            'gujarati': 'gu',
            'marathi': 'mr',
            'punjabi': 'pa',
            'assamese': 'as',
            'oriya': 'or',
            'nepali': 'ne',
            'roman': 'hi',  # Default for romanized text
        }
        
        # Supported languages
        self.supported_languages = [
            'hindi', 'bengali', 'tamil', 'telugu', 'kannada', 'malayalam',
            'gujarati', 'marathi', 'oriya', 'punjabi', 'assamese', 'nepali',
            'konkani', 'awadhi', 'bhojpuri', 'maithili', 'magadhi', 'kashmiri',
            'bodo', 'tulu', 'english'
        ]
        
        print(f"✨ Initialization complete!")
        print(f"📊 Model: {self.translation_model_name.split('/')[-1]}")
        print(f"💻 Device: {self.device.upper()}")
        if self.device == "cpu":
            print(f"ℹ️  Note: Using CPU. Translation will be slower but uses less memory.")
        print()
    
    def detect_script(self, text: str) -> Tuple[str, bool]:
        """
        Detect the script used in the text.
        
        Args:
            text: Input text string
            
        Returns:
            Tuple of (detected_language, is_roman_script)
        """
        # Check for Indian scripts
        for lang, pattern in self.script_patterns.items():
            if pattern.search(text):
                return lang, False
        
        # If no Indian script found, assume Roman/English
        return 'roman', True
    
    def transliterate_to_roman(self, text: str) -> str:
        """
        Transliterate text from Indian scripts to Roman script.
        
        Args:
            text: Input text in Indian script
            
        Returns:
            Transliterated text in Roman script
        """
        result = []
        
        for char in text:
            char_code = ord(char)
            transliterated = False
            
            # Find the appropriate Unicode range
            for (start, end), scheme in self.unicode_to_sanscript.items():
                if start <= char_code <= end:
                    try:
                        # Transliterate character by character
                        roman_char = transliterate(char, scheme, sanscript.ITRANS)
                        result.append(roman_char)
                        transliterated = True
                        break
                    except:
                        result.append(char)
                        transliterated = True
                        break
            
            if not transliterated:
                result.append(char)
        
        return ''.join(result)
    
    def preprocess_text(self, text: str) -> Tuple[str, Dict]:
        """
        Preprocess text: detect language, handle mixed scripts.
        
        Args:
            text: Input text
            
        Returns:
            Tuple of (processed_text, metadata)
        """
        metadata = {
            'original_text': text,
            'detected_language': None,
            'is_roman_script': False,
            'has_mixed_script': False,
            'transliterated': False
        }
        
        # Detect script
        detected_lang, is_roman = self.detect_script(text)
        metadata['detected_language'] = detected_lang
        metadata['is_roman_script'] = is_roman
        
        # Check for mixed scripts (has both Roman and Indian scripts)
        has_indian_script = any(pattern.search(text) for pattern in self.script_patterns.values())
        has_roman = bool(re.search(r'[a-zA-Z]', text))
        metadata['has_mixed_script'] = has_indian_script and has_roman
        
        # For IndicBART, keep original text (model expects native script)
        # Only transliterate for display purposes
        processed_text = text
        
        # Store transliteration separately for display
        if has_indian_script and not is_roman:
            try:
                transliterated = self.transliterate_to_roman(text)
                metadata['transliterated_text'] = transliterated
                metadata['transliterated'] = True
            except Exception as e:
                print(f"⚠️  Transliteration warning: {e}")
                metadata['transliterated_text'] = text
        
        return processed_text, metadata
    
    def translate_to_english(self, text: str, source_lang: Optional[str] = None) -> str:
        """
        Translate text to English using IndicBART.
        
        Args:
            text: Input text in original script
            source_lang: Detected source language
            
        Returns:
            Translated English text
        """
        try:
            # IndicBART works best with simple tokenization
            # Just provide the text directly
            encoded = self.tokenizer(
                text,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=200
            )
            
            # Move to device
            input_ids = encoded['input_ids'].to(self.device)
            attention_mask = encoded['attention_mask'].to(self.device)
            
            # Generate with conservative parameters to avoid repetition
            with torch.no_grad():
                outputs = self.model.generate(
                    input_ids=input_ids,
                    attention_mask=attention_mask,
                    max_length=100,
                    min_length=1,
                    num_beams=4,
                    length_penalty=1.0,
                    early_stopping=True,
                    no_repeat_ngram_size=3,
                    repetition_penalty=1.5,
                    do_sample=False
                )
            
            # Decode the output
            translation = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            translation = translation.strip()
            
            # Clean up common artifacts
            # Remove if output contains the input (sometimes model echoes)
            if text in translation:
                translation = translation.replace(text, '').strip()
            
            # Remove repetitive patterns
            import re
            # Remove repeated characters (like ..... or <<<<<<)
            translation = re.sub(r'(.)\1{4,}', '', translation)
            # Remove URLs or garbage
            translation = re.sub(r'http\S+|www\S+|pic\.twitter\S+', '', translation)
            # Remove emoji patterns and special characters that shouldn't be in translation
            translation = re.sub(r'[❤️⚡🔥]+', '', translation)
            translation = translation.strip()
            
            # If translation is empty, too short, or looks like garbage
            if not translation or len(translation) < 2:
                # Try a simpler approach - just the text
                return self._simple_translate(text)
            
            # Check if translation is mostly non-ASCII (might be bad output)
            ascii_chars = sum(1 for c in translation if ord(c) < 128)
            if len(translation) > 0 and ascii_chars / len(translation) < 0.5:
                return self._simple_translate(text)
            
            return translation
            
        except Exception as e:
            print(f"❌ Translation error: {e}")
            return self._simple_translate(text)
    
    def _simple_translate(self, text: str, source_lang: Optional[str] = None) -> str:
        """
        Basic fallback using simple dictionary for common phrases.
        """
        # Common translations
        translations = {
            'नमस्ते': 'Hello / Greetings',
            'धन्यवाद': 'Thank you',
            'शुभ प्रभात': 'Good morning',
            'आप कैसे हैं': 'How are you',
            'मैं ठीक हूं': 'I am fine',
            'namaste': 'Hello',
            'dhanyavad': 'Thank you',
        }
        
        # Check direct match
        if text.strip() in translations:
            return translations[text.strip()]
        
        # Try lowercase
        if text.strip().lower() in translations:
            return translations[text.strip().lower()]
        
        return f"[Text: {text}] - IndicBART needs fine-tuning"
    
    def process(self, text: str, verbose: bool = True) -> Dict:
        """
        Complete processing pipeline: detect, transliterate, and translate.
        
        Args:
            text: Input text in any supported Indian language
            verbose: Whether to print processing steps
            
        Returns:
            Dictionary with all processing results
        """
        if verbose:
            print(f"\n{'='*60}")
            print(f"📝 Input: {text}")
            print(f"{'='*60}")
        
        # Step 1: Preprocess and detect
        processed_text, metadata = self.preprocess_text(text)
        
        if verbose:
            print(f"\n🔍 Detection:")
            print(f"   Language: {metadata['detected_language']}")
            print(f"   Script: {'Roman' if metadata['is_roman_script'] else 'Native'}")
            print(f"   Mixed Script: {metadata['has_mixed_script']}")
        
        # Step 2: Transliterate if needed (for display only)
        if metadata.get('transliterated') and verbose:
            print(f"\n🔤 Transliteration:")
            print(f"   {metadata.get('transliterated_text', processed_text)}")
        
        # Step 3: Translate to English (using original text)
        if verbose:
            print(f"\n🌐 Translating to English...")
        
        # Use original text for translation (IndicBART expects native script)
        translation = self.translate_to_english(text, metadata['detected_language'])
        
        if verbose:
            print(f"\n✅ Translation:")
            print(f"   {translation}")
            print(f"{'='*60}\n")
        
        return {
            'original': text,
            'detected_language': metadata['detected_language'],
            'is_roman_script': metadata['is_roman_script'],
            'has_mixed_script': metadata['has_mixed_script'],
            'transliterated': metadata.get('transliterated_text') if metadata.get('transliterated') else None,
            'translation': translation,
            'metadata': metadata
        }


def main():
    """Main function to demonstrate the Indian language processor."""
    
    print("=" * 70)
    print("🇮🇳 Indian Language Transliteration & Translation System")
    print("=" * 70)
    print("Supports: Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali,")
    print("          Gujarati, Marathi, Punjabi, Assamese, Nepali, Konkani,")
    print("          Awadhi, Bhojpuri, Maithili, Magadhi, Kashmiri, Bodo, Tulu")
    print("=" * 70)
    print()
    
    # Initialize processor
    processor = IndianLanguageProcessor()
    
    # Example texts in different languages and scripts
    examples = [
        "नमस्ते, मैं आज बाजार जा रहा हूँ",  # Hindi (Devanagari)
        "আমি ভাত খাই",  # Bengali
        "நான் சாப்பிடுகிறேன்",  # Tamil
        "నేను తెలుగు మాట్లాడతాను",  # Telugu
        "ನಾನು ಕನ್ನಡ ಮಾತನಾಡುತ್ತೇನೆ",  # Kannada
        "मी मराठी बोलतो",  # Marathi (Devanagari)
        "Namaste, aaj main office jaa raha hun",  # Hindi (Roman)
        "मैं office जा रहा हूँ",  # Hindi with English (Mixed)
    ]
    
    print("🧪 Processing example texts:\n")
    
    results = []
    for example in examples:
        result = processor.process(example, verbose=True)
        results.append(result)
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 SUMMARY OF ALL TRANSLATIONS")
    print("=" * 70)
    for i, result in enumerate(results, 1):
        print(f"\n{i}. Original: {result['original']}")
        print(f"   Language: {result['detected_language']}")
        print(f"   Translation: {result['translation']}")
    
    print("\n" + "=" * 70)
    print("💡 Interactive Mode")
    print("=" * 70)
    print("Enter text in any Indian language (local or Roman script)")
    print("Type 'quit' or 'exit' to stop\n")
    
    # Interactive mode
    while True:
        try:
            user_input = input("📝 Enter text: ").strip()
            
            if user_input.lower() in ['quit', 'exit', 'q']:
                print("\n👋 Goodbye!")
                break
            
            if not user_input:
                continue
            
            result = processor.process(user_input, verbose=True)
            
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"❌ Error: {e}")


if __name__ == "__main__":
    main()

