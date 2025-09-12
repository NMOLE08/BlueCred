import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';

class AddDataScreen extends StatefulWidget {
  const AddDataScreen({super.key});

  @override
  State<AddDataScreen> createState() => _AddDataScreenState();
}

class _AddDataScreenState extends State<AddDataScreen> {
  // Form key and controllers
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _saplingsController = TextEditingController();
  final TextEditingController _heightController = TextEditingController();
  
  // State variables
  String? _dataType;
  String? _healthStatus;
  int _selectedIndex = 1; // Default to Add Data tab (index 1)
  bool _isSubmitting = false;
  
  // Image picker
  final ImagePicker _picker = ImagePicker();
  List<File> _photos = [];
  List<File> _videos = [];

  // Dummy data for dropdowns
  final List<String> _dataTypes = ['Project', 'Observation'];
  final List<String> _healthStatuses = ['Good', 'Fair', 'Poor'];

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
    
    if (index == 0) {
      // Navigate to Home
      if (ModalRoute.of(context)?.settings.name != '/home') {
        Navigator.pushReplacementNamed(context, '/home');
      }
    } else if (index == 2) {
      // Navigate to Profile
      Navigator.pushReplacementNamed(context, '/login');
    } else if (index == 1) {
      // If already on Add Data screen, just update the index
      setState(() {
        _selectedIndex = index;
      });
    }
  }

  Future<void> _pickPhoto() async {
    final XFile? photo = await _picker.pickImage(source: ImageSource.gallery);
    if (photo != null) {
      setState(() {
        _photos.add(File(photo.path));
      });
    }
  }

  Future<void> _pickVideo() async {
    final XFile? video = await _picker.pickVideo(source: ImageSource.gallery);
    if (video != null) {
      setState(() {
        _videos.add(File(video.path));
      });
    }
  }

  void _submitData() {
    if (_formKey.currentState!.validate()) {
      setState(() {
        _isSubmitting = true;
      });
      
      // Simulate API call
      Future.delayed(const Duration(seconds: 2), () {
        setState(() {
          _isSubmitting = false;
        });
        
        // Show success message
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Data submitted successfully!')),
        );
        
        // Reset form
        _formKey.currentState!.reset();
        _photos.clear();
        _videos.clear();
      });
    }
  }
  
  @override
  void dispose() {
    _saplingsController.dispose();
    _heightController.dispose();
    super.dispose();
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
          child: SingleChildScrollView(
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
                            'assets/images/logo.png',
                            height: 40,
                            errorBuilder: (context, error, stackTrace) {
                              return Icon(Icons.eco, size: 40, color: Colors.white);
                            },
                          ),
                          const SizedBox(width: 8),
                          const Text(
                            'BlueCred',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                            ),
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
                            onPressed: _pickPhoto,
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
                  Container(
                    padding: const EdgeInsets.all(24.0),
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
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'General Details',
                            style: TextStyle(
                              color: Color(0xFF005AC6),
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 20),
                          const Text(
                            'Project Name : Seagrass Meadows',
                            style: TextStyle(fontSize: 16),
                          ),
                          const SizedBox(height: 5),
                          const Text(
                            'Project ID : STK1234',
                            style: TextStyle(fontSize: 16),
                          ),
                          const SizedBox(height: 20),
                          DropdownButtonFormField<String>(
                            value: _dataType,
                            decoration: const InputDecoration(
                              labelText: 'Data type',
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.all(
                                  Radius.circular(15),
                                ),
                              ),
                            ),
                            items: _dataTypes.map((String value) {
                              return DropdownMenuItem<String>(
                                value: value,
                                child: Text(value),
                              );
                            }).toList(),
                            onChanged: (String? newValue) {
                              setState(() {
                                _dataType = newValue;
                              });
                            },
                            validator: (value) {
                              if (value == null) {
                                return 'Please select a data type';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 30),
                          const Text(
                            'Observation Metric',
                            style: TextStyle(
                              color: Color(0xFF005AC6),
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 20),
                          DropdownButtonFormField<String>(
                            value: _healthStatus,
                            decoration: const InputDecoration(
                              labelText: 'Health Status',
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.all(
                                  Radius.circular(15),
                                ),
                              ),
                            ),
                            items: _healthStatuses.map((String value) {
                              return DropdownMenuItem<String>(
                                value: value,
                                child: Text(value),
                              );
                            }).toList(),
                            onChanged: (String? newValue) {
                              setState(() {
                                _healthStatus = newValue;
                              });
                            },
                            validator: (value) {
                              if (value == null) {
                                return 'Please select a health status';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 20),
                          TextFormField(
                            controller: _saplingsController,
                            decoration: const InputDecoration(
                              labelText: 'No. of saplings planted',
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.all(
                                  Radius.circular(15),
                                ),
                              ),
                            ),
                            keyboardType: TextInputType.number,
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'Please enter number of saplings';
                              }
                              if (int.tryParse(value) == null) {
                                return 'Please enter a valid number';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 20),
                          TextFormField(
                            controller: _heightController,
                            decoration: const InputDecoration(
                              labelText: 'Avg. Sapling Height (In cm)',
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.all(
                                  Radius.circular(15),
                                ),
                              ),
                            ),
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'Please enter a value';
                              }
                              if (double.tryParse(value) == null) {
                                return 'Please enter a valid number';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 30),
                          const Text(
                            'Visual Verification',
                            style: TextStyle(
                              color: Color(0xFF005AC6),
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 20),
                          Row(
                            children: [
                              Expanded(
                                child: ElevatedButton(
                                  onPressed: () async {
                                    await _pickPhoto();
                                  },
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF005AC6),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(30),
                                    ),
                                  ),
                                  child: Text(
                                    'Upload Photo (${_photos.length})',
                                    style: const TextStyle(color: Colors.white),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: OutlinedButton(
                                  onPressed: () async {
                                    await _pickVideo();
                                  },
                                  style: OutlinedButton.styleFrom(
                                    side: const BorderSide(
                                      color: Color(0xFF005AC6),
                                    ),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(30),
                                    ),
                                  ),
                                  child: Text('Upload Video (${_videos.length})'),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 30),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: _isSubmitting ? null : _submitData,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF005AC6),
                                padding: const EdgeInsets.symmetric(
                                  vertical: 16,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(30),
                                ),
                              ),
                              child: _isSubmitting
                                  ? const CircularProgressIndicator(
                                      color: Colors.white,
                                    )
                                  : const Text(
                                      'SUBMIT',
                                      style: TextStyle(color: Colors.white),
                                    ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: _onItemTapped,
        backgroundColor: const Color(0xFF1D1F20),
        selectedItemColor: Colors.black,
        unselectedItemColor: Colors.white,
        selectedLabelStyle: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
        unselectedLabelStyle: const TextStyle(color: Colors.white),
        showUnselectedLabels: true,
        type: BottomNavigationBarType.fixed,
        items: [
          BottomNavigationBarItem(
            icon: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: _selectedIndex == 0 ? Colors.white : Colors.transparent,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.home_outlined),
            ),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: _selectedIndex == 1 ? Colors.white : Colors.transparent,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.add_circle),
            ),
            label: 'Add Data',
          ),
          BottomNavigationBarItem(
            icon: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: _selectedIndex == 2 ? Colors.white : Colors.transparent,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.person_outline),
            ),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
