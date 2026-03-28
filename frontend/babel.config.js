module.exports = function(api) {
  api.cache(true);
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // NativeWind for Tailwind CSS in React Native
      'nativewind/babel',
      
      // Reanimated for smooth animations
      'react-native-reanimated/plugin',
      
      // Optional: Transform inline environment variables
      ['transform-inline-environment-variables', {
        include: [
          'NODE_ENV',
          'EXPO_PUBLIC_API_URL',
          'EXPO_PUBLIC_APP_VARIANT'
        ]
      }],
      
      // Optional: Module resolver for cleaner imports
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: [
            '.ios.js',
            '.android.js',
            '.js',
            '.jsx',
            '.ts',
            '.tsx',
            '.json'
          ],
          alias: {
            // Core aliases
            '@': './src',
            '@components': './src/components',
            '@screens': './src/screens',
            '@navigation': './src/navigation',
            '@utils': './src/utils',
            '@store': './src/store',
            '@assets': './assets',
            '@types': './src/types',
            
            // Mosa-specific aliases
            '@mosa': './src',
            '@ventures': './src/ventures',
            '@gamification': './src/gamification',
            '@services': './src/services',
          }
        }
      ],
      
      // Optional: For better debugging in development
      ...(process.env.NODE_ENV === 'development' 
        ? [
            // Adds component display names for better debugging
            ['babel-plugin-transform-react-jsx-display-name'],
            // Optional: For React DevTools
            ['@babel/plugin-transform-react-jsx-source']
          ] 
        : []
      ),
      
      // Optional: For production optimizations
      ...(process.env.NODE_ENV === 'production' 
        ? [
            // Removes console.log in production
            ['transform-remove-console', { exclude: ['error', 'warn'] }],
            // Optional: Minification plugin if needed
            // 'babel-plugin-transform-remove-debugger'
          ] 
        : []
      )
    ],
    
    // Environment-specific configurations
    env: {
      development: {
        plugins: [
          // Development-specific plugins
        ]
      },
      production: {
        plugins: [
          // Production-specific plugins
        ]
      }
    }
  };
};