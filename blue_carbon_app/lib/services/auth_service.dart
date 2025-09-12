import 'package:blue_carbon_app/data/dummy_data.dart';
import 'package:blue_carbon_app/models/user.dart';
import 'package:blue_carbon_app/services/api_service.dart';

class AuthService {
  final ApiService _apiService = ApiService();
  bool _useRealApi = true; // Toggle between real API and dummy data
  
  // Current user storage
  User? _currentUser;
  User? get currentUser => _currentUser;
  
  // Check if user is authenticated
  bool get isAuthenticated => _currentUser != null;
  
  // Real API sign-in method
  Future<bool> signIn(String email, String password) async {
    if (_useRealApi) {
      try {
        final response = await _apiService.signIn(email, password);
        
        if (response['success'] == true && response['user'] != null) {
          _currentUser = User(
            name: response['user']['name'] ?? '',
            email: response['user']['email'] ?? '',
            password: '', // Don't store password
          );
          return true;
        }
        return false;
      } catch (e) {
        print('API sign-in failed, falling back to dummy data: $e');
        _useRealApi = false;
        return await _signInDummy(email, password);
      }
    } else {
      return await _signInDummy(email, password);
    }
  }
  
  // Fallback dummy sign-in method
  Future<bool> _signInDummy(String email, String password) async {
    // Simulate a network delay
    await Future.delayed(const Duration(seconds: 2));

    // Normalize inputs to avoid case/whitespace mismatches
    final normalizedEmail = email.trim().toLowerCase();
    final normalizedPassword = password.trim();

    // Find the user in our dummy data (case-insensitive email match)
    final user = dummyUsers.firstWhere(
      (user) => user.email.trim().toLowerCase() == normalizedEmail,
      orElse: () => const User(name: '', email: '', password: ''),
    );

    // Check if the user was found and the password matches
    if (user.email.isNotEmpty && user.password.trim() == normalizedPassword) {
      _currentUser = user;
      return true;
    }
    return false;
  }

  // Real API sign-up method
  Future<bool> signUp(String name, String email, String password) async {
    if (_useRealApi) {
      try {
        final response = await _apiService.signUp(name, email, password);
        
        if (response['success'] == true) {
          // Auto sign-in after successful registration
          return await signIn(email, password);
        }
        return false;
      } catch (e) {
        print('API sign-up failed, falling back to dummy data: $e');
        _useRealApi = false;
        return await _signUpDummy(name, email, password);
      }
    } else {
      return await _signUpDummy(name, email, password);
    }
  }
  
  // Fallback dummy sign-up method
  Future<bool> _signUpDummy(String name, String email, String password) async {
    // Simulate a network delay
    await Future.delayed(const Duration(seconds: 2));

    // Normalize inputs
    final normalizedEmail = email.trim().toLowerCase();

    // Check if the email already exists in the dummy data (case-insensitive)
    final userExists = dummyUsers.any(
      (user) => user.email.trim().toLowerCase() == normalizedEmail,
    );

    if (userExists) {
      return false; // Email already in use
    }

    // Create new user
    final newUser = User(
      name: name.trim(),
      email: normalizedEmail,
      password: password.trim(),
    );
    
    _currentUser = newUser;
    print('User signed up: ${name.trim()}, $normalizedEmail');
    return true;
  }
  
  // Sign out method
  Future<void> signOut() async {
    _currentUser = null;
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
  }
}
