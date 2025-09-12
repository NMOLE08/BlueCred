import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter/services.dart';
import 'dart:async' show runZonedGuarded;

import 'screens/welcome_screen.dart';
import 'screens/homepage_screen.dart';
import 'screens/add_data_screen.dart';
import 'screens/profile_screen.dart';
import 'services/api_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Set preferred orientations
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Initialize API service
  try {
    await ApiService.initialize();
    
    // For development - print if we're running in debug mode
    if (const bool.fromEnvironment('dart.vm.product') == false) {
      debugPrint('API Service initialized successfully');
    }
  } catch (e) {
    debugPrint('Failed to initialize API service: $e');
    // You might want to show an error dialog or handle this differently
  }

  // Error handling for the entire app
  runZonedGuarded(
    () => runApp(
      const App(
        showPerformanceOverlay: false,
        debugShowCheckedModeBanner: false,
      ),
    ),
    (error, stackTrace) {
      debugPrint('Uncaught error: $error');
      debugPrint('Stack trace: $stackTrace');
      // You might want to log this to a crash reporting service
    },
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
  
  // This widget is the root of your application.
  // It initializes the app and sets up the theme and routing.

  @override
  Widget build(BuildContext context) {
    final theme = ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xFF005AC6), // Primary blue from design
        brightness: Brightness.light,
      ),
      textTheme: GoogleFonts.latoTextTheme().copyWith(
        bodyMedium: GoogleFonts.inter(color: Colors.black87),
        bodyLarge: GoogleFonts.inter(color: Colors.black87),
        headlineLarge: GoogleFonts.inter(
          color: Colors.black87,
          fontWeight: FontWeight.bold,
        ),
        headlineMedium: GoogleFonts.inter(
          color: Colors.black87,
          fontWeight: FontWeight.w600,
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFF005AC6),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF005AC6),
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 24),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
    );

    return MaterialApp(
      debugShowCheckedModeBanner: debugShowCheckedModeBanner,
      title: 'Blue Carbon',
      theme: theme,
      initialRoute: '/',
      routes: {
        '/': (context) => const WelcomeScreen(),
        '/home': (context) => const HomepageScreen(),
        '/add-data': (context) {
          final args = ModalRoute.of(context)!.settings.arguments as Map<String, dynamic>?;
          return AddDataScreen(
            projectId: args?['projectId'] ?? '',
          );
        },
        '/profile': (context) => const ProfileScreen(),
      },
      onGenerateRoute: (settings) {
        // Handle 404
        return MaterialPageRoute(
          builder: (context) => Scaffold(
            appBar: AppBar(
              title: const Text('Page Not Found'),
              backgroundColor: Theme.of(context).colorScheme.primary,
              foregroundColor: Colors.white,
            ),
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.error_outline,
                    size: 64,
                    color: Colors.red,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    '404 - Page Not Found',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'No route defined for: ${settings.name}',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: () => Navigator.pushReplacementNamed(context, '/'),
                    child: const Text('Go to Home'),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
