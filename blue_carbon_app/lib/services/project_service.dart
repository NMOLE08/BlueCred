import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/project.dart';

class ProjectService {
  static const String baseUrl = 'http://127.0.0.1:5001/api';
  
  // Get all projects
  static Future<List<Project>> getAllProjects() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/public/projects/summaries'),
        headers: {'Content-Type': 'application/json'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true && data['data'] != null) {
          final List<dynamic> projectsJson = data['data']['projects'] ?? [];
          return projectsJson.map((json) => Project.fromJson(json)).toList();
        }
      }
      throw Exception('Failed to load projects: ${response.statusCode}');
    } catch (e) {
      print('Error fetching projects: $e');
      return [];
    }
  }

  // Get projects by verification status
  static Future<List<Project>> getProjectsByStatus(String status) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/projects?verificationStatus=$status'),
        headers: {'Content-Type': 'application/json'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true && data['data'] != null) {
          final List<dynamic> projectsJson = data['data']['projects'] ?? [];
          return projectsJson.map((json) => Project.fromJson(json)).toList();
        }
      }
      throw Exception('Failed to load projects by status: ${response.statusCode}');
    } catch (e) {
      print('Error fetching projects by status: $e');
      return [];
    }
  }

  // Get project by ID
  static Future<Project?> getProjectById(String projectId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/projects/$projectId'),
        headers: {'Content-Type': 'application/json'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true && data['data'] != null) {
          return Project.fromJson(data['data']['project']);
        }
      }
      return null;
    } catch (e) {
      print('Error fetching project by ID: $e');
      return null;
    }
  }

  // Create new project
  static Future<Project?> createProject({
    required String name,
    required String description,
    required String location,
    required String type,
    required String ngoId,
  }) async {
    try {
      final projectId = 'PRJ_${DateTime.now().millisecondsSinceEpoch}_${_generateRandomString(8)}';
      
      final response = await http.post(
        Uri.parse('$baseUrl/projects'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'projectId': projectId,
          'projectName': name,
          'projectDescription': description,
          'projectLocation': location,
          'projectType': type,
          'ngoId': ngoId,
        }),
      );

      if (response.statusCode == 201) {
        final data = json.decode(response.body);
        if (data['success'] == true && data['data'] != null) {
          return Project.fromJson(data['data']['project']);
        }
      }
      throw Exception('Failed to create project: ${response.statusCode}');
    } catch (e) {
      print('Error creating project: $e');
      return null;
    }
  }

  // Get verification statistics
  static Future<Map<String, dynamic>?> getVerificationStats() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/verification/stats'),
        headers: {'Content-Type': 'application/json'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true) {
          return data['data'];
        }
      }
      return null;
    } catch (e) {
      print('Error fetching verification stats: $e');
      return null;
    }
  }

  // Get pending projects for verification
  static Future<List<Project>> getPendingProjects() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/verification/pending'),
        headers: {'Content-Type': 'application/json'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true && data['data'] != null) {
          final List<dynamic> projectsJson = data['data']['projects'] ?? [];
          return projectsJson.map((json) => Project.fromJson(json)).toList();
        }
      }
      return [];
    } catch (e) {
      print('Error fetching pending projects: $e');
      return [];
    }
  }

  // Submit project data (for ML analysis)
  static Future<bool> submitProjectData({
    required String projectId,
    required double carbonKg,
    String? recipientAddress,
    bool autoApprove = false,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/projects/$projectId/ml-webhook'),
        headers: {
          'Content-Type': 'application/json',
          'x-ml-secret': '7a3d9f2b6c4e8a1d5f0c3b2a9e7d4c1f8b6a3d2e0f1c4b7a9d3e5f6a1b2c3d4e',
        },
        body: json.encode({
          'carbonKg': carbonKg,
          'confidenceScore': 0.95,
          'modelVersion': 'flutter-app-v1.0',
          'rawData': {
            'source': 'flutter_app',
            'timestamp': DateTime.now().toIso8601String(),
          },
          'autoApprove': autoApprove,
          'recipientAddress': recipientAddress,
        }),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['success'] == true;
      }
      return false;
    } catch (e) {
      print('Error submitting project data: $e');
      return false;
    }
  }

  // Helper function to generate random string
  static String _generateRandomString(int length) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    final random = DateTime.now().millisecondsSinceEpoch;
    return String.fromCharCodes(Iterable.generate(
      length,
      (_) => chars.codeUnitAt(random % chars.length),
    ));
  }
}
