class Project {
  final String projectId;
  final String name;
  final String description;
  final String location;
  final String type;
  final String imageUrl;
  final String ngoName;
  final String verificationStatus;
  final double carbonCredits;
  final double confidenceScore;
  final DateTime createdAt;
  final DateTime? verifiedAt;

  const Project({
    required this.projectId,
    required this.name,
    required this.description,
    required this.location,
    required this.type,
    required this.imageUrl,
    required this.ngoName,
    required this.verificationStatus,
    required this.carbonCredits,
    required this.confidenceScore,
    required this.createdAt,
    this.verifiedAt,
  });

  factory Project.fromJson(Map<String, dynamic> json) {
    return Project(
      projectId: json['projectId'] ?? '',
      name: json['projectName'] ?? '',
      description: json['projectDescription'] ?? '',
      location: json['projectLocation'] ?? '',
      type: json['projectType'] ?? '',
      imageUrl: json['imageUrl'] ?? 'assets/images/default_project.png',
      ngoName: json['ngoId']?['organizationName'] ?? 'Unknown NGO',
      verificationStatus: json['verificationStatus'] ?? 'pending',
      carbonCredits: (json['mlAnalysis']?['carbonCreditsCalculated'] ?? 0).toDouble(),
      confidenceScore: (json['mlAnalysis']?['confidenceScore'] ?? 0).toDouble(),
      createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
      verifiedAt: json['verificationDetails']?['verifiedAt'] != null 
          ? DateTime.parse(json['verificationDetails']['verifiedAt'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'projectId': projectId,
      'projectName': name,
      'projectDescription': description,
      'projectLocation': location,
      'projectType': type,
      'imageUrl': imageUrl,
      'ngoName': ngoName,
      'verificationStatus': verificationStatus,
      'carbonCredits': carbonCredits,
      'confidenceScore': confidenceScore,
      'createdAt': createdAt.toIso8601String(),
      'verifiedAt': verifiedAt?.toIso8601String(),
    };
  }

  String get statusColor {
    switch (verificationStatus) {
      case 'approved':
        return '#28a745';
      case 'rejected':
        return '#dc3545';
      case 'under_review':
        return '#17a2b8';
      default:
        return '#ffc107';
    }
  }

  String get formattedStatus {
    return verificationStatus.replaceAll('_', ' ').toUpperCase();
  }
}
