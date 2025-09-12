import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:connectivity_plus/connectivity_plus.dart' show Connectivity, ConnectivityResult;

// Custom exception for API errors
class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic data;

  ApiException({required this.message, this.statusCode, this.data});

  @override
  String toString() => 'ApiException: $message';
}

// Custom exception for network errors
class NetworkException implements Exception {
  final String message;

  NetworkException(this.message);

  @override
  String toString() => 'NetworkException: $message';
}

class ApiService {
  static const String baseUrl = 'http://localhost:3001/api';
  static const Duration timeoutDuration = Duration(seconds: 30);
  static String? _authToken;
  
  static final Connectivity _connectivity = Connectivity();
  
  // Get headers with auth token
  static Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (_authToken != null) 'Authorization': 'Bearer $_authToken',
  };
  
  // Handle HTTP response
  static dynamic _handleResponse(http.Response response) {
    final responseBody = json.decode(utf8.decode(response.bodyBytes));
    
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return responseBody;
    } else {
      throw ApiException(
        message: responseBody['message'] ?? 'Request failed',
        statusCode: response.statusCode,
        data: responseBody,
      );
    }
  }

  // Initialize with token from SharedPreferences and check connectivity
  static Future<void> initialize() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _authToken = prefs.getString('auth_token');
      
      // Check connectivity
      final connectivityResult = await _connectivity.checkConnectivity();
      if (connectivityResult == ConnectivityResult.none) {
        throw NetworkException('No internet connection');
      }
    } catch (e) {
      throw ApiException(message: 'Failed to initialize API service: ${e.toString()}');
    }
  }
  
  // Set authentication token
  static Future<void> setAuthToken(String token) async {
    _authToken = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
  }
  
  // Clear authentication token
  static Future<void> clearAuthToken() async {
    _authToken = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
  }
  
  // Check if user is authenticated
  static bool get isAuthenticated => _authToken != null;
  
  // Get all projects with optional filters
  static Future<Map<String, dynamic>> getProjects({
    String? status,
    String? dataType,
    String? startDate,
    String? endDate,
  }) async {
    try {
      // Check connectivity first
      final connectivityResult = await _connectivity.checkConnectivity();
      if (connectivityResult == ConnectivityResult.none) {
        throw NetworkException('No internet connection');
      }
      
      var uri = Uri.parse('$baseUrl/projects');
      final Map<String, String> queryParams = {};
      
      if (status != null) queryParams['status'] = status;
      if (dataType != null) queryParams['dataType'] = dataType;
      if (startDate != null) queryParams['startDate'] = startDate;
      if (endDate != null) queryParams['endDate'] = endDate;
      
      if (queryParams.isNotEmpty) {
        uri = uri.replace(queryParameters: queryParams);
      }
      
      final response = await http.get(
        uri,
        headers: _headers,
      ).timeout(timeoutDuration);
      
      final responseData = _handleResponse(response);
      return {
        'success': true,
        'data': responseData,
        'message': 'Projects retrieved successfully',
      };
      
    } on TimeoutException {
      throw ApiException(message: 'Request timed out');
    } on SocketException {
      throw NetworkException('Unable to connect to the server');
    } on FormatException {
      throw ApiException(message: 'Invalid server response format');
    } catch (e) {
      if (e is ApiException || e is NetworkException) rethrow;
      throw ApiException(message: 'Error getting projects: ${e.toString()}');
    }
  }
  
  // Update project status with improved error handling
  static Future<Map<String, dynamic>> updateProjectStatus(
    String projectId,
    String status, {
    int maxRetries = 2,
  }) async {
    try {
      // Check connectivity first
      final connectivityResult = await _connectivity.checkConnectivity();
      if (connectivityResult == ConnectivityResult.none) {
        throw NetworkException('No internet connection');
      }
      
      int attempt = 0;
      bool shouldRetry = false;
      
      do {
        try {
          final response = await http.patch(
            Uri.parse('$baseUrl/projects/$projectId/status'),
            headers: _headers,
            body: jsonEncode({'status': status}),
          ).timeout(timeoutDuration);
          
          final responseData = _handleResponse(response);
          return {
            'success': true,
            'data': responseData,
            'message': 'Status updated successfully',
          };
          
        } on TimeoutException {
          if (attempt < maxRetries) {
            shouldRetry = true;
            attempt++;
            await Future.delayed(const Duration(seconds: 1));
          } else {
            throw ApiException(message: 'Request timed out after $maxRetries attempts');
          }
        } on SocketException {
          throw NetworkException('Unable to connect to the server');
        } on FormatException {
          throw ApiException(message: 'Invalid server response format');
        } catch (e) {
          if (e is ApiException || e is NetworkException) rethrow;
          throw ApiException(message: 'Error updating status: ${e.toString()}');
        }
      } while (shouldRetry && attempt <= maxRetries);
      
      throw ApiException(message: 'Failed to update status after $maxRetries attempts');
      
    } catch (e) {
      rethrow;
    }
  }
  
  // Submit project data with media files
  static Future<Map<String, dynamic>> submitProjectData({
    required String projectId,
    required Map<String, dynamic> data,
    List<File>? photos,
    List<File>? videos,
    int maxRetries = 2,
  }) async {
    try {
      // Check connectivity first
      final connectivityResult = await _connectivity.checkConnectivity();
      if (connectivityResult == ConnectivityResult.none) {
        throw NetworkException('No internet connection');
      }

      // Validate file sizes
      if (photos != null) {
        for (var photo in photos) {
          final size = await photo.length();
          if (size > 10 * 1024 * 1024) { // 10MB limit
            throw ApiException(message: 'Photo ${photo.path} exceeds 10MB limit');
          }
        }
      }

      if (videos != null) {
        for (var video in videos) {
          final size = await video.length();
          if (size > 50 * 1024 * 1024) { // 50MB limit
            throw ApiException(message: 'Video ${video.path} exceeds 50MB limit');
          }
        }
      }

      final uri = Uri.parse('$baseUrl/projects/$projectId/data');
      final request = http.MultipartRequest('POST', uri);
      
      // Add headers
      request.headers.addAll({
        'Authorization': 'Bearer $_authToken',
      });
      
      // Add form data
      data.forEach((key, value) {
        if (value != null) {
          request.fields[key] = value.toString();
        }
      });
      
      // Add photos
      if (photos != null) {
        for (var photo in photos) {
          request.files.add(await http.MultipartFile.fromPath(
            'photos',
            photo.path,
          ));
        }
      }
      
      // Add videos
      if (videos != null) {
        for (var video in videos) {
          request.files.add(await http.MultipartFile.fromPath(
            'videos',
            video.path,
          ));
        }
      }
      
      // Send request with retry logic
      int attempt = 0;
      while (attempt <= maxRetries) {
        try {
          final streamedResponse = await request.send().timeout(timeoutDuration);
          final response = await http.Response.fromStream(streamedResponse);
          
          if (response.statusCode >= 200 && response.statusCode < 300) {
            final responseData = json.decode(utf8.decode(response.bodyBytes));
            return {
              'success': true,
              'data': responseData,
              'message': 'Data submitted successfully',
            };
          } else {
            throw ApiException(
              message: 'Failed to submit data',
              statusCode: response.statusCode,
              data: json.decode(utf8.decode(response.bodyBytes)),
            );
          }
        } on TimeoutException {
          attempt++;
          if (attempt > maxRetries) {
            throw ApiException(message: 'Request timed out after $maxRetries attempts');
          }
          await Future.delayed(const Duration(seconds: 1));
        }
      }
      
      throw ApiException(message: 'Failed to submit data after $maxRetries attempts');
      
    } on SocketException {
      throw NetworkException('Unable to connect to the server');
    } on FormatException {
      throw ApiException(message: 'Invalid server response format');
    } catch (e) {
      if (e is ApiException || e is NetworkException) rethrow;
      throw ApiException(message: 'Error submitting data: ${e.toString()}');
    }
  }
}
