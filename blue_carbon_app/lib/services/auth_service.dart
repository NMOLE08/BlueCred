import 'package:blue_carbon_app/data/dummy_data.dart';
import 'package:blue_carbon_app/models/user.dart';

class AuthService {
  // A simple dummy sign-in method that checks against the dummy data.
  Future<bool> signIn(String email, String password) async {
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
      return true;
    }
    return false;
  }

  // A simple dummy sign-up method.
  Future<bool> signUp(String name, String email, String password) async {
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

    // In a real app, you would add the new user to a database.
    // For this dummy implementation, we'll just simulate success.
    print('User signed up: ${name.trim()}, $normalizedEmail');
    return true;
  }
}
