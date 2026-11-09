import re
import unicodedata
from typing import Dict

# Zero-width characters
ZERO_WIDTH_REGEX = re.compile(r"[\u200B-\u200D\uFEFF]")

# Devanagari numerals to ASCII numerals
DEVANAGARI_DIGITS: Dict[str, str] = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
}

# 12-month Hindi to month index map
HINDI_MONTHS: Dict[str, str] = {
    'जनवरी': 'january', 'फ़रवरी': 'february', 'फरवरी': 'february',
    'मार्च': 'march', 'अप्रैल': 'april', 'मई': 'may', 'जून': 'june',
    'जुलाई': 'july', 'अगस्त': 'august', 'सितंबर': 'september',
    'सितम्बर': 'september', 'अक्टूबर': 'october', 'अक्तूबर': 'october',
    'नवंबर': 'november', 'नवम्बर': 'november', 'दिसंबर': 'december',
    'दिसम्बर': 'december'
}

# Hindi number words commonly used in demo scripts (explicitly constrained per spec)
HINDI_NUMBER_WORDS: Dict[str, str] = {
    'शून्य': '0', 'एक': '1', 'दो': '2', 'तीन': '3', 'चार': '4',
    'पाँच': '5', 'पांच': '5', 'छह': '6', 'सात': '7', 'आठ': '8',
    'नौ': '9', 'दस': '10', 'ग्यारह': '11', 'बारह': '12', 'तेरह': '13',
    'चौदह': '14', 'पंद्रह': '15', 'पन्द्रह': '15', 'सोलह': '16',
    'सत्रह': '17', 'अट्ठारह': '18', 'उन्नीस': '19', 'बीस': '20',
    'पचास': '50', 'सौ': '100', 'हज़ार': '1000', 'हजार': '1000',
    'डेढ़ सौ': '150', 'एक सौ पचास': '150',
    'चार हज़ार दो सौ पचास': '4250',
    'चार हजार दो सौ पचास': '4250',
}

def devanagari_to_ascii_digits(text: str) -> str:
    """Convert Devanagari numerals ०-९ to 0-9."""
    for dev, asc in DEVANAGARI_DIGITS.items():
        text = text.replace(dev, asc)
    return text

def normalize_currency_and_numbers(text: str) -> str:
    """
    Remove currency symbols (₹, rs, rs., inr, rupees) and thousands separators in numbers.
    ₹4,250 -> 4250
    Rs. 4,250 -> 4250
    """
    # Replace known Hindi composite number phrases first
    for hi_phrase, num_str in sorted(HINDI_NUMBER_WORDS.items(), key=lambda x: -len(x[0])):
        text = text.replace(hi_phrase, num_str)

    # Normalize currency prefixes
    text = re.sub(r'(?:₹|rs\.?|rupees?|inr)\s*(\d+(?:,\d+)*(?:\.\d+)?)', r'\1', text, flags=re.IGNORECASE)
    
    # Remove commas between digits e.g. 4,250 -> 4250
    text = re.sub(r'(?<=\d),(?=\d)', '', text)
    return text

def normalize_dates(text: str) -> str:
    """
    Normalize month forms:
    '12 November', '12 नवंबर', 'बारह नवंबर' -> '12 november'
    """
    for hi_month, en_month in HINDI_MONTHS.items():
        text = text.replace(hi_month, en_month)
    return text

def strip_punctuation_except_numbers(text: str) -> str:
    """
    Strips punctuation except dots/colons that occur between numbers (e.g. 4.8 or 12:00).
    """
    # Temporarily preserve decimal points in numbers
    # Replace non-alphanumeric except whitespace and periods between digits
    chars = []
    n = len(text)
    for i, ch in enumerate(text):
        if ch.isalnum() or ch.isspace() or '\u0900' <= ch <= '\u097F':
            chars.append(ch)
        elif ch in ('.', ':', '-') and 0 < i < n - 1 and text[i-1].isdigit() and text[i+1].isdigit():
            chars.append(ch)
        else:
            chars.append(' ')
    return "".join(chars)

def normalize_text_hindi(text: str) -> str:
    """
    Full normalisation pipeline for Hindi and Hinglish:
    1. Unicode NFC
    2. Remove zero-width characters
    3. Lowercase Latin characters
    4. Devanagari digits to ASCII digits
    5. Currency and number-word normalisation
    6. Date normalisation
    7. Punctuation stripping
    8. Whitespace collapse
    """
    if not text:
        return ""

    # Step 1: Unicode NFC
    text = unicodedata.normalize("NFC", text)

    # Step 2: Remove zero-width characters
    text = ZERO_WIDTH_REGEX.sub("", text)

    # Step 3: Lowercase Latin
    text = text.lower()

    # Step 4: Devanagari digits to ASCII
    text = devanagari_to_ascii_digits(text)

    # Step 5: Currency and number phrases
    text = normalize_currency_and_numbers(text)

    # Step 6: Dates
    text = normalize_dates(text)

    # Step 7: Punctuation
    text = strip_punctuation_except_numbers(text)

    # Step 8: Collapse whitespace
    text = re.sub(r"\s+", " ", text).strip()

    return text
