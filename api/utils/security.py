"""
Security utilities module for data validation and input sanitization
"""
import re
import html
import os
from typing import Any
from pathlib import Path


def sanitize_input(user_input: str) -> str:
    """
    Sanitize user input to prevent XSS attacks
    
    Args:
        user_input: Raw user input string
        
    Returns:
        Sanitized string safe for processing
    """
    if not isinstance(user_input, str):
        return str(user_input)
    
    # Remove script tags and their content entirely first
    sanitized = re.sub(r'<script[^>]*>.*?</script>', '', user_input, flags=re.IGNORECASE | re.DOTALL)
    
    # HTML escape to prevent XSS
    sanitized = html.escape(sanitized)
    
    # Remove potentially dangerous HTML tags
    dangerous_tags = [
        'script', 'iframe', 'object', 'embed', 'form', 'input',
        'button', 'select', 'textarea', 'link', 'meta', 'style'
    ]
    
    for tag in dangerous_tags:
        # Remove opening and closing tags
        sanitized = re.sub(f'<{tag}[^>]*>', '', sanitized, flags=re.IGNORECASE)
        sanitized = re.sub(f'</{tag}>', '', sanitized, flags=re.IGNORECASE)
    
    # Remove javascript: and data: protocols
    sanitized = re.sub(r'javascript:', '', sanitized, flags=re.IGNORECASE)
    sanitized = re.sub(r'data:', '', sanitized, flags=re.IGNORECASE)
    
    # Remove dangerous JavaScript functions
    js_functions = ['alert', 'confirm', 'prompt', 'eval', 'setTimeout', 'setInterval']
    for func in js_functions:
        sanitized = re.sub(f'{func}\\s*\\(', '', sanitized, flags=re.IGNORECASE)
    
    # Remove event handlers
    event_handlers = [
        'onclick', 'onload', 'onmouseover', 'onmouseout', 'onfocus', 'onblur',
        'onchange', 'onsubmit', 'onkeydown', 'onkeyup', 'onkeypress'
    ]
    
    for handler in event_handlers:
        sanitized = re.sub(f'{handler}\\s*=\\s*["\'][^"\']*["\']', '', sanitized, flags=re.IGNORECASE)
    
    return sanitized.strip()


def sanitize_sql_input(user_input: str) -> str:
    """
    Sanitize input to prevent SQL injection attacks
    
    Args:
        user_input: Raw user input string
        
    Returns:
        Sanitized string safe for SQL queries
    """
    if not isinstance(user_input, str):
        return str(user_input)
    
    # Remove common SQL injection patterns
    sql_patterns = [
        r'(\'|(\\\')|(\-\-)|(;)|(\|)|(\*)|(\%)|(\+)|(\$))',  # Common SQL chars
        r'(union|select|insert|update|delete|drop|create|alter|exec|execute)',  # SQL keywords
        r'(script|javascript|vbscript)',  # Script injection
        r'(sp_|xp_|usp_)',  # Stored procedure prefixes
        r'(\bor\b|\band\b)',  # Boolean operators
        r'(information_schema|sysobjects|syscolumns)',  # System tables
    ]
    
    sanitized = user_input
    for pattern in sql_patterns:
        sanitized = re.sub(pattern, '', sanitized, flags=re.IGNORECASE)
    
    # Remove extra whitespace
    sanitized = re.sub(r'\s+', ' ', sanitized).strip()
    
    return sanitized


def validate_file_path(file_path: str) -> bool:
    """
    Validate file path to prevent directory traversal attacks
    
    Args:
        file_path: File path to validate
        
    Returns:
        True if path is safe, False otherwise
    """
    if not isinstance(file_path, str):
        return False
    
    # Check for path traversal patterns
    dangerous_patterns = [
        '..',  # Parent directory
        '//',  # Double slashes
        '\\\\',  # Double backslashes (Windows)
        'null',  # Null bytes
        '\x00',  # Null character
    ]
    
    # Normalize the path
    try:
        normalized_path = os.path.normpath(file_path)
        resolved_path = str(Path(normalized_path).resolve())
    except (ValueError, OSError):
        return False
    
    # Check for dangerous patterns
    for pattern in dangerous_patterns:
        if pattern in file_path.lower() or pattern in normalized_path.lower():
            return False
    
    # Check if path contains parent directory references
    if '..' in str(Path(file_path).parts):
        return False
    
    # Ensure path is within expected directories
    allowed_prefixes = ['uploads/', './uploads/', 'temp/', './temp/', 'data/', './data/']
    
    # Convert to forward slashes for consistent checking
    check_path = file_path.replace('\\', '/')
    
    # If it's a relative path and starts with allowed prefixes, it's OK
    if any(check_path.startswith(prefix) for prefix in allowed_prefixes):
        return True
    
    # If it's an absolute path, be more restrictive
    if os.path.isabs(file_path):
        # Only allow paths within the application directory
        try:
            app_dir = str(Path.cwd().resolve())
            if not resolved_path.startswith(app_dir):
                return False
        except (ValueError, OSError):
            return False
    
    # Additional check: ensure no executable extensions
    dangerous_extensions = ['.exe', '.bat', '.sh', '.ps1', '.cmd', '.com', '.scr']
    file_ext = Path(file_path).suffix.lower()
    
    if file_ext in dangerous_extensions:
        return False
    
    return True


def validate_filename(filename: str) -> bool:
    """
    Validate uploaded filename for security
    
    Args:
        filename: Name of uploaded file
        
    Returns:
        True if filename is safe, False otherwise
    """
    if not isinstance(filename, str) or not filename.strip():
        return False
    
    # Check length
    if len(filename) > 255:
        return False
    
    # Check for dangerous characters
    dangerous_chars = ['<', '>', ':', '"', '|', '?', '*', '\x00']
    if any(char in filename for char in dangerous_chars):
        return False
    
    # Check for reserved Windows names
    reserved_names = [
        'CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5',
        'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4',
        'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
    ]
    
    name_without_ext = Path(filename).stem.upper()
    if name_without_ext in reserved_names:
        return False
    
    # Check file extension
    allowed_extensions = ['.csv', '.txt', '.json', '.xlsx', '.xls', '.parquet']
    file_ext = Path(filename).suffix.lower()
    
    if file_ext not in allowed_extensions:
        return False
    
    return True


def hash_password(password: str) -> str:
    """
    Hash password securely (placeholder - use proper hashing in production)
    
    Args:
        password: Plain text password
        
    Returns:
        Hashed password
    """
    import hashlib
    import secrets
    
    # Generate a random salt
    salt = secrets.token_hex(32)
    
    # Hash the password with salt
    password_hash = hashlib.pbkdf2_hmac('sha256', 
                                       password.encode('utf-8'), 
                                       salt.encode('utf-8'), 
                                       100000)  # 100,000 iterations
    
    # Return salt and hash combined
    return salt + password_hash.hex()


def verify_password(password: str, hashed_password: str) -> bool:
    """
    Verify password against hash
    
    Args:
        password: Plain text password
        hashed_password: Stored password hash
        
    Returns:
        True if password matches, False otherwise
    """
    import hashlib
    
    try:
        # Extract salt (first 64 characters)
        salt = hashed_password[:64]
        stored_hash = hashed_password[64:]
        
        # Hash the provided password with the stored salt
        password_hash = hashlib.pbkdf2_hmac('sha256',
                                           password.encode('utf-8'),
                                           salt.encode('utf-8'),
                                           100000)
        
        # Compare hashes
        return password_hash.hex() == stored_hash
        
    except (ValueError, IndexError):
        return False


def generate_csrf_token() -> str:
    """
    Generate CSRF token for form protection
    
    Returns:
        Random CSRF token
    """
    import secrets
    return secrets.token_urlsafe(32)


def validate_csrf_token(token: str, session_token: str) -> bool:
    """
    Validate CSRF token
    
    Args:
        token: Token from form
        session_token: Token from session
        
    Returns:
        True if tokens match, False otherwise
    """
    if not isinstance(token, str) or not isinstance(session_token, str):
        return False
    
    return token == session_token


def rate_limit_check(identifier: str, max_requests: int = 100, 
                    time_window: int = 3600) -> bool:
    """
    Simple rate limiting check (in-memory implementation)
    
    Args:
        identifier: IP address or user identifier
        max_requests: Maximum requests allowed
        time_window: Time window in seconds
        
    Returns:
        True if request is allowed, False if rate limited
    """
    import time
    from collections import defaultdict
    
    # Simple in-memory storage (use Redis/database in production)
    if not hasattr(rate_limit_check, 'requests'):
        rate_limit_check.requests = defaultdict(list)
    
    current_time = time.time()
    
    # Clean old requests
    rate_limit_check.requests[identifier] = [
        req_time for req_time in rate_limit_check.requests[identifier]
        if current_time - req_time < time_window
    ]
    
    # Check if under limit
    if len(rate_limit_check.requests[identifier]) < max_requests:
        rate_limit_check.requests[identifier].append(current_time)
        return True
    
    return False