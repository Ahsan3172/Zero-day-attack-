import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface DebugData {
  all_results: any[];
  results_by_user: Array<{
    user_id: number;
    count: number;
    username: string;
  }>;
  current_user_id: number;
}

interface AllResultsData {
  results: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const Debug: React.FC = () => {
  const { user } = useAuth();
  const [debugData, setDebugData] = useState<DebugData | null>(null);
  const [allResultsData, setAllResultsData] = useState<AllResultsData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDebugData = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    setLoading(true);
    try {
      // Fetch debug info
      const debugResponse = await fetch('http://localhost:5000/api/models/debug/results', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const debugData = await debugResponse.json();
      console.log('Debug API Response:', debugData);
      
      if (debugData.success) {
        setDebugData(debugData.data);
      }

      // Fetch all results (for all users)
      const allResultsResponse = await fetch('http://localhost:5000/api/models/debug/all-results', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const allResultsData = await allResultsResponse.json();
      console.log('All Results API Response:', allResultsData);
      
      if (allResultsData.success) {
        setAllResultsData(allResultsData.data);
      }
    } catch (error) {
      console.error('Error fetching debug data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebugData();
  }, [user]);

  if (!user) {
    return <div>Please log in to view debug info</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Debug Information</h1>
      
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Current User</h2>
        <pre className="bg-gray-100 p-2 rounded">
          {JSON.stringify({ id: user.id, username: user.username }, null, 2)}
        </pre>
      </div>

      <button 
        onClick={fetchDebugData}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        {loading ? 'Loading...' : 'Refresh Debug Data'}
      </button>

      {debugData && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Results by User</h2>
            <div className="bg-gray-100 p-4 rounded">
              {debugData.results_by_user.length > 0 ? (
                debugData.results_by_user.map((userResult, index) => (
                  <div key={index} className="mb-2">
                    User ID {userResult.user_id} ({userResult.username}): {userResult.count} results
                  </div>
                ))
              ) : (
                <p>No results found in database</p>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold">All Results (Latest 20)</h2>
            <div className="bg-gray-100 p-4 rounded max-h-96 overflow-y-auto">
              <pre>{JSON.stringify(debugData.all_results, null, 2)}</pre>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Backend Current User ID</h2>
            <div className="bg-gray-100 p-2 rounded">
              {debugData.current_user_id}
            </div>
          </div>
        </div>
      )}

      {allResultsData && (
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-4">All Test Results (All Users)</h2>
          <div className="bg-gray-100 p-4 rounded">
            <p className="mb-2">Total Results: {allResultsData.pagination.total}</p>
            {allResultsData.results.length > 0 ? (
              <div className="space-y-2">
                {allResultsData.results.map((result, index) => (
                  <div key={index} className="bg-white p-3 rounded border">
                    <div><strong>Result ID:</strong> {result.id}</div>
                    <div><strong>User ID:</strong> {result.user_id} ({result.username})</div>
                    <div><strong>Model:</strong> {result.model_name} - {result.algorithm}</div>
                    <div><strong>Dataset:</strong> {result.dataset_name}</div>
                    <div><strong>Accuracy:</strong> {result.accuracy}%</div>
                    <div><strong>Created:</strong> {new Date(result.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p>No results found in database</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Debug;