import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'package:permission_handler/permission_handler.dart';
import 'package:blue_carbon_app/screens/profile_page.dart';
import 'package:blue_carbon_app/screens/homepage_screen.dart';

class AddDataScreen extends StatefulWidget {
  const AddDataScreen({super.key});

  @override
  State<AddDataScreen> createState() => _AddDataScreenState();
}

class _AddDataScreenState extends State<AddDataScreen> {
  // A key to uniquely identify the form
  final _formKey = GlobalKey<FormState>();
  String? _dataType;
  String? _healthStatus;
  String? _saplingsCount; // captured from form
  String? _avgSaplingHeight; // captured from form
  final ImagePicker _picker = ImagePicker();
  XFile? _selectedImage;
  XFile? _selectedVideo;

  // Dummy data for dropdowns
  final List<String> _dataTypes = ['Project', 'Observation'];
  final List<String> _healthStatuses = ['Good', 'Fair', 'Poor'];

  void _submitData() {
    if (_formKey.currentState!.validate()) {
      _formKey.currentState!.save();
      if (_selectedImage != null || _selectedVideo != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Data added successfully')),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please upload a photo or video')),
        );
      }
    }
  }

  Future<ImageSource?> _chooseSource({required bool forVideo}) async {
    return showDialog<ImageSource>(
      context: context,
      builder: (context) {
        return SimpleDialog(
          title: Text(forVideo ? 'Select video source' : 'Select image source'),
          children: [
            SimpleDialogOption(
              onPressed: () => Navigator.pop(context, ImageSource.camera),
              child: const Text('Camera'),
            ),
            SimpleDialogOption(
              onPressed: () => Navigator.pop(context, ImageSource.gallery),
              child: const Text('Gallery'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _pickImage() async {
    final source = await _chooseSource(forVideo: false);
    if (source == null) return;

    // Request permissions
    if (source == ImageSource.camera) {
      final camStatus = await Permission.camera.request();
      if (camStatus.isPermanentlyDenied) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text(
              'Camera permission permanently denied. Open settings to enable.',
            ),
            action: SnackBarAction(
              label: 'Settings',
              onPressed: () => openAppSettings(),
            ),
          ),
        );
        return;
      }
      if (!camStatus.isGranted) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Camera permission denied')),
        );
        return;
      }
    } else {
      if (Platform.isIOS) {
        final photosStatus = await Permission.photos.request();
        if (photosStatus.isPermanentlyDenied) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text(
                'Photo library permission permanently denied. Open settings to enable.',
              ),
              action: SnackBarAction(
                label: 'Settings',
                onPressed: () => openAppSettings(),
              ),
            ),
          );
          return;
        }
        if (!photosStatus.isGranted) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Photo library permission denied')),
          );
          return;
        }
      } else if (Platform.isAndroid) {
        // On Android, do not request storage permission for gallery; launch picker directly.
      }
    }

    // Ensure the dialog is fully dismissed before launching the system picker
    await Future.delayed(const Duration(milliseconds: 200));

    XFile? image;
    try {
      image = await _picker.pickImage(source: source);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to open picker: $e')));
      return;
    }
    if (!mounted) return;
    setState(() {
      _selectedImage = image;
    });
    if (image != null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Selected image: ${image.name}')));
    } else {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('No image selected')));
    }
  }

  Future<void> _pickVideo() async {
    final source = await _chooseSource(forVideo: true);
    if (source == null) return;

    // Request permissions
    if (source == ImageSource.camera) {
      final camStatus = await Permission.camera.request();
      final micStatus = await Permission.microphone.request();
      if (camStatus.isPermanentlyDenied || micStatus.isPermanentlyDenied) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text(
              'Camera/Microphone permission permanently denied. Open settings to enable.',
            ),
            action: SnackBarAction(
              label: 'Settings',
              onPressed: () => openAppSettings(),
            ),
          ),
        );
        return;
      }
      if (!camStatus.isGranted || !micStatus.isGranted) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Camera/Microphone permission denied')),
        );
        return;
      }
    } else {
      if (Platform.isIOS) {
        final photosStatus = await Permission.photos.request();
        if (photosStatus.isPermanentlyDenied) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text(
                'Photo library permission permanently denied. Open settings to enable.',
              ),
              action: SnackBarAction(
                label: 'Settings',
                onPressed: () => openAppSettings(),
              ),
            ),
          );
          return;
        }
        if (!photosStatus.isGranted) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Photo library permission denied')),
          );
          return;
        }
      } else if (Platform.isAndroid) {
        // On Android, do not request storage permission for gallery; launch picker directly.
      }
    }

    // Ensure the dialog is fully dismissed before launching the system picker
    await Future.delayed(const Duration(milliseconds: 200));

    XFile? video;
    try {
      video = await _picker.pickVideo(source: source);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to open picker: $e')));
      return;
    }
    if (!mounted) return;
    setState(() {
      _selectedVideo = video;
    });
    if (video != null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Selected video: ${video.name}')));
    } else {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('No video selected')));
    }
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
                          Image.asset('assets/images/app_logo.png', height: 40),
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
                                return 'Please enter a value';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 20),
                          TextFormField(
                            decoration: const InputDecoration(
                              labelText: 'Avg. Sapling Height (In cm)',
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.all(
                                  Radius.circular(15),
                                ),
                              ),
                            ),
                            keyboardType: TextInputType.number,
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'Please enter a value';
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
                                  onPressed: _pickImage,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF005AC6),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(30),
                                    ),
                                  ),
                                  child: const Text(
                                    'Upload Photo',
                                    style: TextStyle(color: Colors.white),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: OutlinedButton(
                                  onPressed: _pickVideo,
                                  style: OutlinedButton.styleFrom(
                                    side: const BorderSide(
                                      color: Color(0xFF005AC6),
                                    ),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(30),
                                    ),
                                  ),
                                  child: const Text('Upload Video'),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 30),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: _submitData,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF005AC6),
                                padding: const EdgeInsets.symmetric(
                                  vertical: 16,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(30),
                                ),
                              ),
                              child: const Text(
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
        backgroundColor: Colors.white,
        selectedItemColor: const Color(0xFF005AC6),
        unselectedItemColor: Colors.grey,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.photo_album), label: 'Data'),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
        ],
        currentIndex: 1,
        onTap: (index) {
          if (index == 0) {
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(builder: (_) => const HomepageScreen()),
            );
          } else if (index == 2) {
            Navigator.of(
              context,
            ).push(MaterialPageRoute(builder: (_) => const ProfilePage()));
          }
        },
      ),
    );
  }
}
