import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

class ApiService {
  static const String baseUrl = 'http://localhost:3000/api';
  
  // Submit project data to backend
  static Future<Map<String, dynamic>> submitProjectData({
    required String projectName,
    required String projectId,
    required String dataType,
    required String healthStatus,
    required int saplingsPlanted,
    required double avgSaplingHeight,
    String? location,
    String? organization,
    List<File>? photos,
    List<File>? videos,
  }) async {
    try {
      var request = http.MultipartRequest('POST', Uri.parse('$baseUrl/projects'));
      
      // Add text fields
      request.fields['projectName'] = projectName;
      request.fields['projectId'] = projectId;
      request.fields['dataType'] = dataType;
      request.fields['healthStatus'] = healthStatus;
      request.fields['saplingsPlanted'] = saplingsPlanted.toString();
      request.fields['avgSaplingHeight'] = avgSaplingHeight.toString();
      
      if (location != null) request.fields['location'] = location;
      if (organization != null) request.fields['organization'] = organization;
      
      // Add photo files
      if (photos != null) {
        for (var photo in photos) {
          request.files.add(await http.MultipartFile.fromPath(
            'photos',
            photo.path,
          ));
        }
      }
      
      // Add video files
      if (videos != null) {
        for (var video in videos) {
          request.files.add(await http.MultipartFile.fromPath(
            'videos',
            video.path,
          ));
        }
      }
      
      var response = await request.send();
      var responseBody = await response.stream.bytesToString();
      
      if (response.statusCode == 201) {
        return {
          'success': true,
          'data': json.decode(responseBody),
          'message': 'Data submitted successfully'
        };
      } else {
        return {
          'success': false,
          'error': json.decode(responseBody)['error'] ?? 'Unknown error',
          'message': 'Failed to submit data'
        };
      }
    } catch (e) {
      return {
        'success': false,
        'error': e.toString(),
        'message': 'Network error occurred'
      };
    }
  }
  
  // Get all projects with optional filters
  static Future<Map<String, dynamic>> getProjects({
    String? status,
    String? dataType,
    String? startDate,
    String? endDate,
  }) async {
    try {
      var uri = Uri.parse('$baseUrl/projects');
      Map<String, String> queryParams = {};
      
      if (status != null) queryParams['status'] = status;
      if (dataType != null) queryParams['dataType'] = dataType;
      if (startDate != null) queryParams['startDate'] = startDate;
      if (endDate != null) queryParams['endDate'] = endDate;
      
      if (queryParams.isNotEmpty) {
        uri = uri.replace(queryParameters: queryParams);
      }
      
      var response = await http.get(uri);
      
      if (response.statusCode == 200) {
        return {
          'success': true,
          'data': json.decode(response.body),
          'message': 'Projects retrieved successfully'
        };
      } else {
        return {
          'success': false,
          'error': json.decode(response.body)['error'] ?? 'Unknown error',
          'message': 'Failed to retrieve projects'
        };
      }
    } catch (e) {
      return {
        'success': false,
        'error': e.toString(),
        'message': 'Network error occurred'
      };
    }
  }
  
  // Update project status
  static Future<Map<String, dynamic>> updateProjectStatus(
    String projectId,
    String status,
  ) async {
    try {
      var response = await http.patch(
        Uri.parse('$baseUrl/projects/$projectId/status'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'status': status}),
      );
      
      if (response.statusCode == 200) {
        return {
          'success': true,
          'data': json.decode(response.body),
          'message': 'Status updated successfully'
        };
      } else {
        return {
          'success': false,
          'error': json.decode(response.body)['error'] ?? 'Unknown error',
          'message': 'Failed to update status'
        };
      }
    } catch (e) {
      return {
        'success': false,
        'error': e.toString(),
        'message': 'Network error occurred'
      };
    }
  }
}
