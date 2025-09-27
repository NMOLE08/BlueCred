import 'package:flutter/material.dart';
import 'package:blue_carbon_app/data/dummy_data.dart';
import 'package:blue_carbon_app/data/dummy_project.dart';
import 'package:blue_carbon_app/models/project.dart';
import 'package:blue_carbon_app/screens/add_data_screen.dart';
import 'package:blue_carbon_app/screens/homepage_screen.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  Project? _selectedProject;

  // Map verificationStatus to progress stage count (1..4)
  int _stagesCompletedFor(Project? p) {
    if (p == null) return 0;
    switch (p.verificationStatus) {
      case 'approved':
        return 4; // Data submitted -> Credits issued
      case 'under_review':
        return 2; // Data submitted, AI validated
      case 'rejected':
        return 3; // Up to NCCR verified (then rejected) — show first 3 as completed
      case 'pending':
      default:
        return 1; // Only data submitted
    }
  }

  @override
  Widget build(BuildContext context) {
    final topGradient = const LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [Color(0xFF005AC6), Color(0xFF003D81)],
    );

    // Dummy user data
    final user = dummyUsers.isNotEmpty ? dummyUsers.first : null;
    final name = user?.name ?? 'Coastprotect NGO';
    final email = user?.email ?? 'admin@coastprotect.org';
    final wallet = '0x1a5FdBc891c5D4E6aD68064Ae45';

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(gradient: topGradient),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top bar
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Image.asset('assets/images/app_logo.png', height: 40),
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
                          onPressed: () {},
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          icon: const Icon(
                            Icons.search,
                            color: Colors.white,
                            size: 30,
                          ),
                          onPressed: () {},
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Card with profile fields and tracking
                Expanded(
                  child: SingleChildScrollView(
                    child: Container(
                      padding: const EdgeInsets.all(16),
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
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _LabeledValue(label: 'Name', value: name),
                          const SizedBox(height: 12),
                          _LabeledValue(label: 'Email', value: email),
                          const SizedBox(height: 12),
                          _LabeledValue(label: 'Wallet address', value: wallet),

                          const SizedBox(height: 20),
                          Text(
                            'Track progress',
                            style: Theme.of(context).textTheme.headlineSmall
                                ?.copyWith(
                                  color: const Color(0xFF005AC6),
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                          const SizedBox(height: 10),

                          // Project selector
                          DropdownButtonFormField<Project>(
                            value: _selectedProject,
                            decoration: const InputDecoration(
                              hintText: 'Select project for tracking',
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.all(
                                  Radius.circular(12),
                                ),
                              ),
                              contentPadding: EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 14,
                              ),
                            ),
                            isExpanded: true,
                            items: dummyProjects
                                .map(
                                  (p) => DropdownMenuItem<Project>(
                                    value: p,
                                    child: Text(p.name),
                                  ),
                                )
                                .toList(),
                            onChanged: (p) =>
                                setState(() => _selectedProject = p),
                          ),

                          const SizedBox(height: 20),
                          _ProgressTimeline(
                            completed: _stagesCompletedFor(_selectedProject),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 12),
                Align(
                  alignment: Alignment.centerRight,
                  child: ElevatedButton(
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Profile updated')),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF005AC6),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(30),
                      ),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 12,
                      ),
                    ),
                    child: const Text(
                      'Update Profile',
                      style: TextStyle(color: Colors.white),
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
        currentIndex: 2,
        onTap: (index) {
          if (index == 0) {
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(builder: (_) => const HomepageScreen()),
            );
          } else if (index == 1) {
            Navigator.of(
              context,
            ).push(MaterialPageRoute(builder: (_) => const AddDataScreen()));
          }
        },
      ),
    );
  }
}

class _LabeledValue extends StatelessWidget {
  const _LabeledValue({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: Colors.grey[700],
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 6),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          decoration: BoxDecoration(
            color: const Color(0xFFF1F6FB),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            value,
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: Colors.black),
          ),
        ),
      ],
    );
  }
}

class _ProgressTimeline extends StatelessWidget {
  const _ProgressTimeline({required this.completed});

  final int completed; // 0..4

  Color get _active => const Color(0xFF7B61FF); // purple-ish per figma
  Color get _inactive => Colors.grey[400]!;

  Widget _dot(bool active) => Container(
    width: 14,
    height: 14,
    decoration: BoxDecoration(
      color: active ? _active : _inactive,
      shape: BoxShape.circle,
    ),
  );

  @override
  Widget build(BuildContext context) {
    final stages = const [
      'Data Submitted',
      'AI Validated',
      'NCCR Verified',
      'Credits Issued',
    ];

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F6FB),
        borderRadius: BorderRadius.circular(15),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (int i = 0; i < stages.length; i++) ...[
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // timeline
                Column(
                  children: [
                    _dot(i < completed),
                    if (i < stages.length - 1)
                      Container(
                        width: 2,
                        height: 22,
                        color: i < completed - 1 ? _active : _inactive,
                      ),
                  ],
                ),
                const SizedBox(width: 12),
                Text(
                  stages[i],
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: i < completed ? Colors.black : Colors.grey[600],
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            if (i < stages.length - 1) const SizedBox(height: 8),
          ],
        ],
      ),
    );
  }
}
