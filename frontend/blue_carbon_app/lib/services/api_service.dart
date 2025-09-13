import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:blue_carbon_app/models/user.dart';
import 'package:blue_carbon_app/models/project.dart';

class ApiService {
  static const String baseUrl = 'http://localhost:3002/api';
  static const Duration timeout = Duration(seconds: 30);
  
  // Singleton pattern
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();
  
  // HTTP client with timeout
  final http.Client _client = http.Client();
  
  // Headers for API requests
  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  // Generic API call method
  Future<Map<String, dynamic>> _makeRequest(
    String method,
    String endpoint, {
    Map<String, dynamic>? body,
    Map<String, String>? additionalHeaders,
  }) async {
    try {
      final uri = Uri.parse('$baseUrl$endpoint');
      final headers = {..._headers, ...?additionalHeaders};
      
      http.Response response;
      
      switch (method.toUpperCase()) {
        case 'GET':
          response = await _client.get(uri, headers: headers).timeout(timeout);
          break;
        case 'POST':
          response = await _client.post(
            uri,
            headers: headers,
            body: body != null ? jsonEncode(body) : null,
          ).timeout(timeout);
          break;
        case 'PUT':
          response = await _client.put(
            uri,
            headers: headers,
            body: body != null ? jsonEncode(body) : null,
          ).timeout(timeout);
          break;
        case 'DELETE':
          response = await _client.delete(uri, headers: headers).timeout(timeout);
          break;
        default:
          throw Exception('Unsupported HTTP method: $method');
      }
      
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        throw ApiException(
          'API request failed with status ${response.statusCode}: ${response.body}',
          response.statusCode,
        );
      }
    } on SocketException {
      throw ApiException('No internet connection', 0);
    } on HttpException {
      throw ApiException('HTTP error occurred', 0);
    } on FormatException {
      throw ApiException('Invalid response format', 0);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Unexpected error: $e', 0);
    }
  }
  
  // Authentication methods
  Future<Map<String, dynamic>> signIn(String email, String password) async {
    return await _makeRequest('POST', '/auth/login', body: {
      'email': email,
      'password': password,
    });
  }
  
  Future<Map<String, dynamic>> signUp(String name, String email, String password) async {
    return await _makeRequest('POST', '/auth/register', body: {
      'name': name,
      'email': email,
      'password': password,
    });
  }
  
  // Project methods
  Future<List<Map<String, dynamic>>> getProjects() async {
    final response = await _makeRequest('GET', '/projects');
    return List<Map<String, dynamic>>.from(response['projects'] ?? []);
  }
  
  Future<Map<String, dynamic>> getProject(String projectId) async {
    return await _makeRequest('GET', '/projects/$projectId');
  }
  
  Future<Map<String, dynamic>> createProject(Map<String, dynamic> projectData) async {
    return await _makeRequest('POST', '/projects', body: projectData);
  }
  
  Future<Map<String, dynamic>> updateProject(String projectId, Map<String, dynamic> projectData) async {
    return await _makeRequest('PUT', '/projects/$projectId', body: projectData);
  }
  
  // Data submission methods
  Future<Map<String, dynamic>> submitFieldData(String projectId, Map<String, dynamic> fieldData) async {
    return await _makeRequest('POST', '/projects/$projectId/data', body: fieldData);
  }
  
  Future<Map<String, dynamic>> uploadMedia(String projectId, List<Map<String, dynamic>> mediaFiles) async {
    return await _makeRequest('POST', '/projects/$projectId/media', body: {
      'media': mediaFiles,
    });
  }
  
  // User profile methods
  Future<Map<String, dynamic>> getUserProfile(String userId) async {
    return await _makeRequest('GET', '/users/$userId');
  }
  
  Future<Map<String, dynamic>> updateUserProfile(String userId, Map<String, dynamic> profileData) async {
    return await _makeRequest('PUT', '/users/$userId', body: profileData);
  }
  
  // Dashboard stats
  Future<Map<String, dynamic>> getDashboardStats() async {
    return await _makeRequest('GET', '/dashboard/stats');
  }
  
  // Verification queue
  Future<List<Map<String, dynamic>>> getVerificationQueue() async {
    final response = await _makeRequest('GET', '/verification-queue');
    return List<Map<String, dynamic>>.from(response['queue'] ?? []);
  }
  
  // Marketplace methods
  Future<List<Map<String, dynamic>>> getMarketplaceListings() async {
    final response = await _makeRequest('GET', '/marketplace/listings');
    return List<Map<String, dynamic>>.from(response['listings'] ?? []);
  }
  
  // Health check
  Future<bool> checkApiHealth() async {
    try {
      await _makeRequest('GET', '/health');
      return true;
    } catch (e) {
      return false;
    }
  }
  
  // Dispose method to clean up resources
  void dispose() {
    _client.close();
  }
}

// Custom exception class for API errors
class ApiException implements Exception {
  final String message;
  final int statusCode;
  
  ApiException(this.message, this.statusCode);
  
  @override
  String toString() => 'ApiException: $message (Status: $statusCode)';
}

// Response wrapper for better error handling
class ApiResponse<T> {
  final T? data;
  final String? error;
  final bool success;
  
  ApiResponse.success(this.data) : error = null, success = true;
  ApiResponse.error(this.error) : data = null, success = false;
}

// Helper methods for common operations
extension ApiServiceHelpers on ApiService {
  Future<ApiResponse<T>> safeRequest<T>(Future<T> Function() request) async {
    try {
      final result = await request();
      return ApiResponse.success(result);
    } on ApiException catch (e) {
      return ApiResponse.error(e.message);
    } catch (e) {
      return ApiResponse.error('Unexpected error: $e');
    }
  }
}
