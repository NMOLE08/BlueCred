import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:blue_carbon_app/screens/welcome_screen.dart';

final theme = ThemeData(
  useMaterial3: true,
  colorScheme: ColorScheme.fromSeed(
    seedColor: const Color.fromARGB(
      255,
      0,
      90,
      198,
    ), // Primary blue from design
    brightness: Brightness.light,
  ),
  textTheme: GoogleFonts.latoTextTheme().copyWith(
    // Set a default style for body text
    bodyMedium: GoogleFonts.inter(color: Colors.white),
    headlineLarge: GoogleFonts.inter(
      color: Colors.white,
      fontWeight: FontWeight.bold,
    ),
    headlineMedium: GoogleFonts.inter(
      color: Colors.white,
      fontWeight: FontWeight.w300,
    ),
  ),
);

void main() {
  // Enable performance overlay for debugging
  runApp(
    const App(
      showPerformanceOverlay: false, // Set to true to show performance overlay
      debugShowCheckedModeBanner: false,
    ),
  );
}

class App extends StatelessWidget {
  const App({
    super.key,
    this.showPerformanceOverlay = false,
    this.debugShowCheckedModeBanner = false,
  });

  final bool showPerformanceOverlay;
  final bool debugShowCheckedModeBanner;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF1D1F20),
          brightness: Brightness.light,
        ),
      ),
      home: const WelcomeScreen(),
    );
  }
}
