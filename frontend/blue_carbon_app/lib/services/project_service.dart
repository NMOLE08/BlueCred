import 'package:blue_carbon_app/models/project.dart';
import 'package:blue_carbon_app/services/api_service.dart';
import 'package:blue_carbon_app/data/dummy_data.dart';

class ProjectService {
  final ApiService _apiService = ApiService();
  bool _useRealApi = true;
  
  // Cache for projects
  List<Project>? _cachedProjects;
  DateTime? _lastCacheUpdate;
  static const Duration cacheTimeout = Duration(minutes: 5);
  
  // Get all projects
  Future<List<Project>> getProjects({bool forceRefresh = false}) async {
    // Check cache first
    if (!forceRefresh && _cachedProjects != null && _lastCacheUpdate != null) {
      if (DateTime.now().difference(_lastCacheUpdate!) < cacheTimeout) {
        return _cachedProjects!;
      }
    }
    
    if (_useRealApi) {
      try {
        final projectsData = await _apiService.getProjects();
        final projects = projectsData.map((data) => Project.fromJson(data)).toList();
        
        // Update cache
        _cachedProjects = projects;
        _lastCacheUpdate = DateTime.now();
        
        return projects;
      } catch (e) {
        print('API getProjects failed, falling back to dummy data: $e');
        _useRealApi = false;
        return _getDummyProjects();
      }
    } else {
      return _getDummyProjects();
    }
  }
  
  // Get dummy projects as fallback
  List<Project> _getDummyProjects() {
    _cachedProjects = dummyProjects;
    _lastCacheUpdate = DateTime.now();
    return dummyProjects;
  }
  
  // Get single project by ID
  Future<Project?> getProject(String projectId) async {
    if (_useRealApi) {
      try {
        final projectData = await _apiService.getProject(projectId);
        return Project.fromJson(projectData);
      } catch (e) {
        print('API getProject failed, falling back to dummy data: $e');
        _useRealApi = false;
        return _getDummyProject(projectId);
      }
    } else {
      return _getDummyProject(projectId);
    }
  }
  
  // Get dummy project by ID
  Project? _getDummyProject(String projectId) {
    try {
      return dummyProjects.firstWhere((project) => project.id == projectId);
    } catch (e) {
      return null;
    }
  }
  
  // Create new project
  Future<Project?> createProject(Map<String, dynamic> projectData) async {
    if (_useRealApi) {
      try {
        final response = await _apiService.createProject(projectData);
        final project = Project.fromJson(response);
        
        // Clear cache to force refresh
        _clearCache();
        
        return project;
      } catch (e) {
        print('API createProject failed: $e');
        return null;
      }
    } else {
      // For dummy mode, create a mock project
      final newProject = Project(
        id: 'DUMMY_${DateTime.now().millisecondsSinceEpoch}',
        name: projectData['name'] ?? 'New Project',
        location: projectData['location'] ?? 'Unknown Location',
        description: projectData['description'] ?? '',
        area: (projectData['area'] as num?)?.toDouble() ?? 0.0,
        projectType: projectData['projectType'] ?? 'Blue Carbon',
        status: 'Active',
        createdAt: DateTime.now(),
        isVerified: false,
        carbonCredits: 0,
        images: [],
        dataPoints: [],
      );
      
      // Add to dummy data (in memory only)
      dummyProjects.add(newProject);
      _clearCache();
      
      return newProject;
    }
  }
  
  // Update project
  Future<Project?> updateProject(String projectId, Map<String, dynamic> projectData) async {
    if (_useRealApi) {
      try {
        final response = await _apiService.updateProject(projectId, projectData);
        final project = Project.fromJson(response);
        
        // Clear cache to force refresh
        _clearCache();
        
        return project;
      } catch (e) {
        print('API updateProject failed: $e');
        return null;
      }
    } else {
      // For dummy mode, update the project in memory
      final projectIndex = dummyProjects.indexWhere((p) => p.id == projectId);
      if (projectIndex != -1) {
        final existingProject = dummyProjects[projectIndex];
        final updatedProject = Project(
          id: existingProject.id,
          name: projectData['name'] ?? existingProject.name,
          location: projectData['location'] ?? existingProject.location,
          description: projectData['description'] ?? existingProject.description,
          area: (projectData['area'] as num?)?.toDouble() ?? existingProject.area,
          projectType: projectData['projectType'] ?? existingProject.projectType,
          status: projectData['status'] ?? existingProject.status,
          createdAt: existingProject.createdAt,
          isVerified: projectData['isVerified'] ?? existingProject.isVerified,
          carbonCredits: (projectData['carbonCredits'] as num?)?.toInt() ?? existingProject.carbonCredits,
          images: existingProject.images,
          dataPoints: existingProject.dataPoints,
        );
        
        dummyProjects[projectIndex] = updatedProject;
        _clearCache();
        
        return updatedProject;
      }
      return null;
    }
  }
  
  // Submit field data for a project
  Future<bool> submitFieldData(String projectId, Map<String, dynamic> fieldData) async {
    if (_useRealApi) {
      try {
        await _apiService.submitFieldData(projectId, fieldData);
        _clearCache(); // Clear cache to force refresh
        return true;
      } catch (e) {
        print('API submitFieldData failed: $e');
        return false;
      }
    } else {
      // For dummy mode, simulate success
      print('Dummy field data submitted for project $projectId: $fieldData');
      return true;
    }
  }
  
  // Upload media files for a project
  Future<bool> uploadMedia(String projectId, List<Map<String, dynamic>> mediaFiles) async {
    if (_useRealApi) {
      try {
        await _apiService.uploadMedia(projectId, mediaFiles);
        _clearCache(); // Clear cache to force refresh
        return true;
      } catch (e) {
        print('API uploadMedia failed: $e');
        return false;
      }
    } else {
      // For dummy mode, simulate success
      print('Dummy media uploaded for project $projectId: ${mediaFiles.length} files');
      return true;
    }
  }
  
  // Get projects by status
  Future<List<Project>> getProjectsByStatus(String status) async {
    final allProjects = await getProjects();
    return allProjects.where((project) => project.status.toLowerCase() == status.toLowerCase()).toList();
  }
  
  // Get user's projects (if user-specific filtering is needed)
  Future<List<Project>> getUserProjects(String userId) async {
    // For now, return all projects. In a real implementation,
    // this would filter by user ownership or participation
    return await getProjects();
  }
  
  // Search projects by name or location
  Future<List<Project>> searchProjects(String query) async {
    final allProjects = await getProjects();
    final lowercaseQuery = query.toLowerCase();
    
    return allProjects.where((project) {
      return project.name.toLowerCase().contains(lowercaseQuery) ||
             project.location.toLowerCase().contains(lowercaseQuery) ||
             project.description.toLowerCase().contains(lowercaseQuery);
    }).toList();
  }
  
  // Get project statistics
  Future<Map<String, dynamic>> getProjectStats() async {
    final projects = await getProjects();
    
    final totalProjects = projects.length;
    final activeProjects = projects.where((p) => p.status.toLowerCase() == 'active').length;
    final verifiedProjects = projects.where((p) => p.isVerified).length;
    final totalCarbonCredits = projects.fold<int>(0, (sum, p) => sum + p.carbonCredits);
    final totalArea = projects.fold<double>(0, (sum, p) => sum + p.area);
    
    return {
      'totalProjects': totalProjects,
      'activeProjects': activeProjects,
      'verifiedProjects': verifiedProjects,
      'totalCarbonCredits': totalCarbonCredits,
      'totalArea': totalArea,
      'averageArea': totalProjects > 0 ? totalArea / totalProjects : 0.0,
    };
  }
  
  // Clear cache
  void _clearCache() {
    _cachedProjects = null;
    _lastCacheUpdate = null;
  }
  
  // Force refresh cache
  Future<List<Project>> refreshProjects() async {
    return await getProjects(forceRefresh: true);
  }
  
  // Check API connectivity
  Future<bool> checkApiConnectivity() async {
    try {
      return await _apiService.checkApiHealth();
    } catch (e) {
      return false;
    }
  }
  
  // Toggle API mode (for testing)
  void setApiMode(bool useRealApi) {
    _useRealApi = useRealApi;
    _clearCache();
  }
  
  // Get cache status
  bool get hasCachedData => _cachedProjects != null;
  DateTime? get lastCacheUpdate => _lastCacheUpdate;
}
