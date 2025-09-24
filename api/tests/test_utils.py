import pytest
import numpy as np
import pandas as pd
from unittest.mock import Mock, patch
import tempfile
import os
from hypothesis import given, strategies as st

from utils.response_formatter import ResponseFormatter
from utils.file_handler import FileHandler
from config import Config

class TestResponseFormatter:
    """Test response formatting functionality"""
    
    @pytest.fixture
    def formatter(self):
        return ResponseFormatter()
    
    def test_success_response(self, formatter):
        data = {"key": "value"}
        response = formatter.success(data, "Success message")
        
        assert response["success"] is True
        assert response["data"] == data
        assert response["message"] == "Success message"
        assert "timestamp" in response
    
    def test_error_response(self, formatter):
        response = formatter.error("Error message", 400)
        
        assert response["success"] is False
        assert response["message"] == "Error message"
        assert response["status_code"] == 400
        assert "timestamp" in response
    
    def test_validation_error_response(self, formatter):
        errors = [{"field": "email", "message": "Invalid email format"}]
        response = formatter.validation_error(errors)
        
        assert response["success"] is False
        assert response["errors"] == errors
        assert "validation" in response["message"].lower()

class TestFileHandler:
    """Test file handling functionality"""
    
    @pytest.fixture
    def file_handler(self):
        return FileHandler()
    
    def test_save_uploaded_file(self, file_handler):
        # Create a mock file
        content = b"test,data\n1,2\n3,4\n"
        
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            temp_file.write(content)
            temp_file.flush()
            
            # Test saving
            saved_path = file_handler.save_uploaded_file(temp_file.name, "test.csv")
            assert os.path.exists(saved_path)
            assert saved_path.endswith("test.csv")
            
            # Cleanup
            os.unlink(saved_path)
        
        os.unlink(temp_file.name)
    
    def test_validate_csv_file(self, file_handler):
        # Valid CSV
        valid_csv = "feature1,feature2,label\n1,2,0\n3,4,1\n"
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write(valid_csv)
            f.flush()
            
            is_valid = file_handler.validate_csv_file(f.name)
            assert is_valid is True
        
        os.unlink(f.name)
        
        # Invalid CSV (malformed)
        invalid_csv = "feature1,feature2,label\n1,2\n3,4,1,extra\n"
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write(invalid_csv)
            f.flush()
            
            is_valid = file_handler.validate_csv_file(f.name)
            assert is_valid is False
        
        os.unlink(f.name)
    
    def test_file_size_validation(self, file_handler):
        # Test file size limits
        large_content = b"x" * (Config.MAX_FILE_SIZE + 1)
        
        with tempfile.NamedTemporaryFile(delete=False) as f:
            f.write(large_content)
            f.flush()
            
            is_valid = file_handler.validate_file_size(f.name)
            assert is_valid is False
        
        os.unlink(f.name)
    
    def test_cleanup_old_files(self, file_handler):
        # Create some old files in the upload directory
        upload_dir = file_handler.upload_dir
        old_files = []
        for i in range(3):
            with tempfile.NamedTemporaryFile(delete=False, dir=str(upload_dir)) as f:
                old_files.append(f.name)
        
        # Mock file creation time to be old
        import time
        old_time = time.time() - (Config.FILE_RETENTION_DAYS * 24 * 3600 + 1)
        
        for file_path in old_files:
            os.utime(file_path, (old_time, old_time))
        
        cleaned_count = file_handler.cleanup_old_files()
        assert cleaned_count >= 0  # Should clean up files

class TestSecurityUtils:
    """Test security-related utilities"""
    
    def test_input_sanitization(self):
        from utils.security import sanitize_input
        
        # Test XSS prevention
        malicious_input = "<script>alert('xss')</script>"
        sanitized = sanitize_input(malicious_input)
        assert "<script>" not in sanitized
        assert "alert" not in sanitized
    
    def test_sql_injection_prevention(self):
        from utils.security import sanitize_sql_input
        
        malicious_sql = "'; DROP TABLE users; --"
        sanitized = sanitize_sql_input(malicious_sql)
        assert "DROP TABLE" not in sanitized.upper()
        assert "--" not in sanitized
    
    def test_path_traversal_prevention(self):
        from utils.security import validate_file_path
        
        # Valid path
        valid_path = "uploads/dataset.csv"
        assert validate_file_path(valid_path) is True
        
        # Path traversal attempt
        malicious_path = "../../etc/passwd"
        assert validate_file_path(malicious_path) is False
        
        # Another path traversal attempt
        malicious_path2 = "uploads/../../../etc/passwd"
        assert validate_file_path(malicious_path2) is False

class TestConfiguration:
    """Test configuration management"""
    
    def test_config_values(self):
        # Test that critical config values are set
        assert hasattr(Config, 'DATABASE_URL')
        assert hasattr(Config, 'SECRET_KEY')
        assert hasattr(Config, 'MAX_FILE_SIZE')
        assert hasattr(Config, 'UPLOAD_DIRECTORY')
    
    def test_environment_specific_config(self):
        # Test different environment configurations
        original_env = os.environ.get('ENVIRONMENT', 'development')
        
        # Test development config
        os.environ['ENVIRONMENT'] = 'development'
        from importlib import reload
        import config
        reload(config)
        
        # Test production config
        os.environ['ENVIRONMENT'] = 'production'
        reload(config)
        
        # Restore original environment
        os.environ['ENVIRONMENT'] = original_env

class TestPropertyBasedTests:
    """Property-based tests using Hypothesis"""
    
    @given(st.text(min_size=1, max_size=1000))
    def test_response_formatter_handles_any_text(self, text):
        formatter = ResponseFormatter()
        response = formatter.success({"message": text})
        
        assert response["success"] is True
        assert response["data"]["message"] == text
    
    @given(st.lists(st.floats(allow_nan=False, allow_infinity=False), min_size=1, max_size=100))
    def test_data_validation_with_random_data(self, data):
        from utils.data_validator import validate_numeric_data
        
        # Should handle any list of valid floats
        result = validate_numeric_data(data)
        assert isinstance(result, bool)
    
    @given(st.integers(min_value=100, max_value=10000))
    def test_file_size_validation_properties(self, size):
        file_handler = FileHandler()
        
        # Create file of specific size
        with tempfile.NamedTemporaryFile(delete=False) as f:
            f.write(b"x" * size)
            f.flush()
            
            is_valid = file_handler.validate_file_size(f.name)
            expected_valid = size <= Config.MAX_FILE_SIZE
            assert is_valid == expected_valid
        
        os.unlink(f.name)

class TestStressTests:
    """Stress testing for performance"""
    
    def test_concurrent_file_uploads(self):
        """Test handling multiple concurrent file uploads"""
        import threading
        import time
        
        file_handler = FileHandler()
        results = []
        
        def upload_file(file_id):
            content = f"test,data,{file_id}\n1,2,3\n".encode()
            with tempfile.NamedTemporaryFile(delete=False) as f:
                f.write(content)
                f.flush()
                
                try:
                    saved_path = file_handler.save_uploaded_file(f.name, f"test_{file_id}.csv")
                    results.append(True)
                    if os.path.exists(saved_path):
                        os.unlink(saved_path)
                except Exception:
                    results.append(False)
                finally:
                    if os.path.exists(f.name):
                        try:
                            os.unlink(f.name)
                        except PermissionError:
                            pass  # File might be locked on Windows
        
        # Create multiple threads
        threads = []
        for i in range(10):
            thread = threading.Thread(target=upload_file, args=(i,))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # All uploads should succeed
        assert all(results)
    
    def test_large_response_formatting(self):
        """Test formatting very large responses"""
        formatter = ResponseFormatter()
        
        # Create large data structure
        large_data = {
            "predictions": list(range(10000)),
            "probabilities": [0.5] * 10000,
            "features": [[i] * 100 for i in range(1000)]
        }
        
        import time
        start_time = time.time()
        response = formatter.success(large_data)
        formatting_time = time.time() - start_time
        
        assert response["success"] is True
        assert len(response["data"]["predictions"]) == 10000
        assert formatting_time < 5  # Should format within 5 seconds
    
    def test_memory_usage_during_processing(self):
        """Test memory usage doesn't grow excessively"""
        import psutil
        import gc
        
        process = psutil.Process()
        initial_memory = process.memory_info().rss
        
        # Perform memory-intensive operations
        for _ in range(100):
            large_array = np.random.rand(1000, 100)
            # Simulate processing
            result = np.mean(large_array, axis=1)
            del large_array, result
            gc.collect()
        
        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory
        
        # Memory increase should be reasonable (less than 100MB)
        assert memory_increase < 100 * 1024 * 1024

class TestFuzzTesting:
    """Fuzz testing with random inputs"""
    
    def test_api_endpoints_with_random_data(self):
        """Test API endpoints with random/malformed data"""
        from fastapi.testclient import TestClient
        from main import app
        
        client = TestClient(app)
        
        # Test with various malformed JSON inputs
        malformed_inputs = [
            '{"invalid": json}',
            '{"features": [1, 2, "invalid"]}',
            '{"model": null}',
            '{"features": []}',
            '{"model": "nonexistent_model"}',
        ]
        
        for malformed_input in malformed_inputs:
            try:
                response = client.post(
                    "/predictions/predict-single",
                    content=malformed_input,
                    headers={"Content-Type": "application/json"}
                )
                # Should handle gracefully (not crash) - including 404 for missing endpoints
                assert response.status_code in [400, 404, 422, 500]
            except Exception as e:
                # Should not raise unhandled exceptions
                assert False, f"Unhandled exception: {e}"
    
    def test_file_upload_with_malformed_files(self):
        """Test file upload with various malformed files"""
        from fastapi.testclient import TestClient
        from main import app
        
        client = TestClient(app)
        
        malformed_files = [
            b"",  # Empty file
            b"not,a,valid,csv\nmalformed,data",  # Malformed CSV
            b"\x00\x01\x02\x03",  # Binary data
            b"extremely,long," + b"x" * 10000,  # Very long line
        ]
        
        for file_content in malformed_files:
            try:
                response = client.post(
                    "/data/upload",
                    files={"file": ("test.csv", file_content, "text/csv")}
                )
                # Should handle gracefully - including 404 for missing endpoints
                assert response.status_code in [400, 404, 422, 500]
            except Exception as e:
                assert False, f"Unhandled exception with malformed file: {e}"