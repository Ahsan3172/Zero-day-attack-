import pytest
import os
import tempfile
import shutil
from unittest.mock import Mock, patch

# Test environment setup
@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """Setup test environment"""
    os.environ["TESTING"] = "true"
    os.environ["DATABASE_URL"] = "sqlite:///test.db"
    os.environ["SECRET_KEY"] = "test-secret-key"
    
    # Create temporary directories for testing
    test_upload_dir = tempfile.mkdtemp()
    test_model_dir = tempfile.mkdtemp()
    
    os.environ["UPLOAD_DIRECTORY"] = test_upload_dir
    os.environ["MODEL_DIRECTORY"] = test_model_dir
    
    yield
    
    # Cleanup
    shutil.rmtree(test_upload_dir, ignore_errors=True)
    shutil.rmtree(test_model_dir, ignore_errors=True)

@pytest.fixture
def mock_database():
    """Mock database connection"""
    with patch('utils.database.get_connection') as mock_conn:
        mock_conn.return_value = Mock()
        yield mock_conn

@pytest.fixture
def sample_csv_content():
    """Sample CSV content for testing"""
    return """feature1,feature2,feature3,label
1.0,2.0,3.0,0
4.0,5.0,6.0,1
7.0,8.0,9.0,0
10.0,11.0,12.0,1
13.0,14.0,15.0,0"""

@pytest.fixture
def temp_csv_file(sample_csv_content):
    """Create temporary CSV file"""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
        f.write(sample_csv_content)
        f.flush()
        yield f.name
    os.unlink(f.name)