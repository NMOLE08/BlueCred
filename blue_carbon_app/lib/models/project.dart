class Project {
  final String projectId;
  final String name;
  final String location;
  final String imageUrl;
  final String? description;
  final String? organization;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const Project({
    this.projectId = '',
    required this.name,
    required this.location,
    required this.imageUrl,
    this.description,
    this.organization,
    this.createdAt,
    this.updatedAt,
  });

  // Convert a Project into a Map
  Map<String, dynamic> toJson() => {
    'id': projectId,
    'name': name,
    'location': location,
    'imageUrl': imageUrl,
    'description': description,
    'organization': organization,
    'createdAt': createdAt?.toIso8601String(),
    'updatedAt': updatedAt?.toIso8601String(),
  };

  // Create a Project from a Map
  factory Project.fromJson(Map<String, dynamic> json) {
    return Project(
      projectId: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Unnamed Project',
      location: json['location']?.toString() ?? 'Location not specified',
      imageUrl: json['imageUrl']?.toString() ?? 'assets/images/project_placeholder.png',
      description: json['description']?.toString(),
      organization: json['organization']?.toString(),
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : null,
      updatedAt: json['updatedAt'] != null ? DateTime.parse(json['updatedAt']) : null,
    );
  }
}
