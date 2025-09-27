import 'package:blue_carbon_app/models/project.dart';

// This file provides dummy project data to populate the home page.
// In a real application, this data would be fetched from a backend.

final List<Project> dummyProjects = [
  Project(
    projectId: 'PRJ_DUMMY_0001',
    name: 'Sunderbans',
    description: 'Mangrove conservation and restoration in the Sundarbans region.',
    location: 'West Bengal, India',
    type: 'mangrove',
    imageUrl: 'https://picsum.photos/id/1018/600/400',
    ngoName: 'Green Earth Initiative',
    verificationStatus: 'approved',
    carbonCredits: 1250.0,
    confidenceScore: 0.93,
    createdAt: DateTime(2024, 5, 20),
  ),
  Project(
    projectId: 'PRJ_DUMMY_0002',
    name: 'Seagrass Meadows',
    description: 'Protection and mapping of seagrass meadows for blue carbon capture.',
    location: 'Tamil Nadu, India',
    type: 'seagrass',
    imageUrl: 'https://picsum.photos/id/1025/600/400',
    ngoName: 'Ocean Conservancy Trust',
    verificationStatus: 'under_review',
    carbonCredits: 860.0,
    confidenceScore: 0.88,
    createdAt: DateTime(2024, 6, 12),
  ),
  Project(
    projectId: 'PRJ_DUMMY_0003',
    name: 'Coastal Wetlands Revival',
    description: 'Restoring tidal wetlands to enhance biodiversity and carbon storage.',
    location: 'Kerala, India',
    type: 'wetland',
    imageUrl: 'https://picsum.photos/id/1036/600/400',
    ngoName: 'Coastal Care Foundation',
    verificationStatus: 'pending',
    carbonCredits: 540.5,
    confidenceScore: 0.81,
    createdAt: DateTime(2024, 7, 2),
  ),
  Project(
    projectId: 'PRJ_DUMMY_0004',
    name: 'Coral Reef Rehabilitation',
    description: 'Community-led coral reef restoration and monitoring program.',
    location: 'Lakshadweep, India',
    type: 'coral',
    imageUrl: 'https://picsum.photos/id/1043/600/400',
    ngoName: 'Blue Reef Alliance',
    verificationStatus: 'rejected',
    carbonCredits: 230.0,
    confidenceScore: 0.72,
    createdAt: DateTime(2024, 7, 15),
  ),
];
