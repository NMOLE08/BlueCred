import 'package:flutter/material.dart';
import 'package:blue_carbon_app/data/dummy_project.dart';
import 'package:blue_carbon_app/models/project.dart';
import 'package:blue_carbon_app/screens/add_data_screen.dart';
import 'package:blue_carbon_app/services/project_service.dart';
import 'package:blue_carbon_app/services/auth_service.dart';

class HomepageScreen extends StatefulWidget {
  const HomepageScreen({super.key});

  @override
  State<HomepageScreen> createState() => _HomepageScreenState();
}

class _HomepageScreenState extends State<HomepageScreen> {
  // State variable to track the selected index of the bottom navigation bar
  int _selectedIndex = 0;
  
  // Services
  final ProjectService _projectService = ProjectService();
  final AuthService _authService = AuthService();
  
  // State variables
  List<Project> _projects = [];
  bool _isLoading = true;
  String? _error;
  bool _isApiConnected = false;

  @override
  void initState() {
    super.initState();
    _initializeData();
  }

  Future<void> _initializeData() async {
    await _checkApiConnectivity();
    await _loadProjects();
  }

  Future<void> _checkApiConnectivity() async {
    try {
      _isApiConnected = await _projectService.checkApiConnectivity();
    } catch (e) {
      _isApiConnected = false;
    }
  }

  Future<void> _loadProjects() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });

      final projects = await _projectService.getProjects();
      
      setState(() {
        _projects = projects;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
        // Fallback to dummy data
        _projects = dummyProjects;
      });
    }
  }

  Future<void> _refreshProjects() async {
    await _loadProjects();
  }

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });

    // Check which item was tapped and navigate accordingly
    if (index == 1) {
      Navigator.of(
        context,
      ).push(MaterialPageRoute(builder: (context) => const AddDataScreen()));
    }
    // You can add more navigation logic for other indices here
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF005AC6), Color(0xFF003D81)],
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Custom App Bar
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Image.asset(
                          'assets/logo.png', // Placeholder for the logo
                          height: 40,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'BlueCred',
                          style: Theme.of(context).textTheme.headlineLarge,
                        ),
                      ],
                    ),
                    Row(
                      children: [
                        IconButton(
                          icon: const Icon(
                            Icons.camera_alt,
                            color: Colors.white,
                            size: 30,
                          ),
                          onPressed: () {
                            // TODO: Add camera functionality
                          },
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          icon: const Icon(
                            Icons.search,
                            color: Colors.white,
                            size: 30,
                          ),
                          onPressed: () {
                            // TODO: Add search functionality
                          },
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 30),
                // Welcome message and user name
                Text(
                  'Hello, ${_authService.currentUser?.name ?? 'User'}',
                  style: Theme.of(context).textTheme.headlineLarge,
                ),
                // API Status Indicator
                if (!_isApiConnected)
                  Container(
                    margin: const EdgeInsets.only(top: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.orange.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.orange),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.cloud_off, color: Colors.orange, size: 16),
                        const SizedBox(width: 6),
                        Text(
                          'Offline Mode',
                          style: TextStyle(color: Colors.orange, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                const SizedBox(height: 20),
                Text(
                  'My Projects',
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 20),
                // Project Cards List
                Expanded(
                  child: _isLoading
                      ? const Center(
                          child: CircularProgressIndicator(
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : _error != null
                          ? Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    Icons.error_outline,
                                    color: Colors.white,
                                    size: 48,
                                  ),
                                  const SizedBox(height: 16),
                                  Text(
                                    'Failed to load projects',
                                    style: TextStyle(color: Colors.white, fontSize: 16),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    'Using offline data',
                                    style: TextStyle(color: Colors.white70, fontSize: 14),
                                  ),
                                  const SizedBox(height: 16),
                                  ElevatedButton(
                                    onPressed: _refreshProjects,
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.white,
                                      foregroundColor: const Color(0xFF005AC6),
                                    ),
                                    child: const Text('Retry'),
                                  ),
                                ],
                              ),
                            )
                          : _projects.isEmpty
                              ? Center(
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        Icons.folder_open,
                                        color: Colors.white,
                                        size: 48,
                                      ),
                                      const SizedBox(height: 16),
                                      Text(
                                        'No projects found',
                                        style: TextStyle(color: Colors.white, fontSize: 16),
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        'Create your first project to get started',
                                        style: TextStyle(color: Colors.white70, fontSize: 14),
                                      ),
                                    ],
                                  ),
                                )
                              : RefreshIndicator(
                                  onRefresh: _refreshProjects,
                                  child: ListView.builder(
                                    itemCount: _projects.length,
                                    itemBuilder: (context, index) {
                                      final project = _projects[index];
                                      return _ProjectCard(
                                        project: project,
                                        onAddData: () => _navigateToAddData(project),
                                        onViewDetails: () => _showProjectDetails(project),
                                      );
                                    },
                                  ),
                                ),
                ),
              ],
            ),
          ),
        ),
      ),
      // Bottom Navigation Bar
      bottomNavigationBar: BottomNavigationBar(
        backgroundColor: Colors.white,
        selectedItemColor: const Color(0xFF005AC6),
        unselectedItemColor: Colors.grey,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.photo_album), label: 'Data'),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
        ],
        currentIndex: _selectedIndex,
        onTap: _onItemTapped,
      ),
    );
  }

  void _navigateToAddData(Project project) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => AddDataScreen(project: project),
      ),
    );
  }

  void _showProjectDetails(Project project) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _ProjectDetailsSheet(project: project),
    );
  }
}

class _ProjectCard extends StatelessWidget {
  const _ProjectCard({
    required this.project,
    this.onAddData,
    this.onViewDetails,
  });

  final Project project;
  final VoidCallback? onAddData;
  final VoidCallback? onViewDetails;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(15),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 10,
            spreadRadius: 2,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: Image.network(
                project.imageUrl,
                width: 100,
                height: 100,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => Container(
                  width: 100,
                  height: 100,
                  color: Colors.grey,
                  child: const Icon(Icons.broken_image, color: Colors.white),
                ),
              ),
            ),
            const SizedBox(width: 20),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    project.name,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      color: Colors.black,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    project.location,
                    style: Theme.of(
                      context,
                    ).textTheme.bodyMedium?.copyWith(color: Colors.grey),
                  ),
                  const SizedBox(height: 15),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton(
                          onPressed: onAddData,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF005AC6),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(30),
                            ),
                          ),
                          child: const Text(
                            'Add data',
                            style: TextStyle(color: Colors.white),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: OutlinedButton(
                          onPressed: onViewDetails,
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Color(0xFF005AC6)),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(30),
                            ),
                          ),
                          child: const Text('View details'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProjectDetailsSheet extends StatelessWidget {
  const _ProjectDetailsSheet({required this.project});

  final Project project;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.8,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(20),
          topRight: Radius.circular(20),
        ),
      ),
      child: Column(
        children: [
          // Handle bar
          Container(
            margin: const EdgeInsets.only(top: 10),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey[300],
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          // Header
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Project Details',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: Colors.black,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
          ),
          // Content
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Project Image
                  ClipRRect(
                    borderRadius: BorderRadius.circular(15),
                    child: Image.network(
                      project.imageUrl,
                      width: double.infinity,
                      height: 200,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => Container(
                        width: double.infinity,
                        height: 200,
                        color: Colors.grey[300],
                        child: const Icon(Icons.image, size: 50, color: Colors.grey),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  // Project Name
                  Text(
                    project.name,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      color: Colors.black,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 10),
                  // Location
                  Row(
                    children: [
                      const Icon(Icons.location_on, color: Colors.grey, size: 20),
                      const SizedBox(width: 5),
                      Text(
                        project.location,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  // Project Stats
                  _buildStatRow('Project Type', project.projectType),
                  _buildStatRow('Status', project.status),
                  _buildStatRow('Area', '${project.area.toStringAsFixed(1)} hectares'),
                  _buildStatRow('Carbon Credits', '${project.carbonCredits} NCT'),
                  _buildStatRow('Created', _formatDate(project.createdAt)),
                  _buildStatRow('Verified', project.isVerified ? 'Yes' : 'Pending'),
                  const SizedBox(height: 20),
                  // Description
                  if (project.description.isNotEmpty) ..[
                    Text(
                      'Description',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: Colors.black,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      project.description,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.grey[700],
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],
                  // Data Points
                  if (project.dataPoints.isNotEmpty) ..[
                    Text(
                      'Data Points (${project.dataPoints.length})',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: Colors.black,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(15),
                      decoration: BoxDecoration(
                        color: Colors.blue[50],
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.blue[200]!),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.analytics, color: Colors.blue[600]),
                          const SizedBox(width: 10),
                          Text(
                            '${project.dataPoints.length} data entries collected',
                            style: TextStyle(color: Colors.blue[700]),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],
                  // Images
                  if (project.images.isNotEmpty) ..[
                    Text(
                      'Images (${project.images.length})',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: Colors.black,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 10),
                    SizedBox(
                      height: 100,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        itemCount: project.images.length,
                        itemBuilder: (context, index) {
                          return Container(
                            margin: const EdgeInsets.only(right: 10),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(10),
                              child: Image.network(
                                project.images[index],
                                width: 100,
                                height: 100,
                                fit: BoxFit.cover,
                                errorBuilder: (context, error, stackTrace) => Container(
                                  width: 100,
                                  height: 100,
                                  color: Colors.grey[300],
                                  child: const Icon(Icons.image, color: Colors.grey),
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                  const SizedBox(height: 30),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: Colors.grey,
              fontWeight: FontWeight.w500,
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              color: Colors.black,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}
