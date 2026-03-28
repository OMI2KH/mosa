/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./navigation/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Mosa Brand Colors
        primary: '#D4A017',    // Gold - Main brand, wealth, energy
        secondary: '#2D5016',  // Deep Green - Growth, nature, trust
        
        // Gamification Colors
        xp: '#F59E0B',         // XP Orange - Rewards, achievements
        success: '#10B981',    // Success Green - Completion, growth
        warning: '#F59E0B',    // Warning Orange - Attention needed
        error: '#EF4444',      // Error Red - Problems, alerts
        info: '#3B82F6',       // Info Blue - Notifications, information
        
        // Venture Colors
        venture: {
          mosa: '#D4A017',     // Gold - Wealth building
          yachi: '#10B981',    // Green - Marketplace, services
          chereka: '#8B5CF6',  // Purple - Creativity, design
          sifr: '#3B82F6',     // Blue - Technology, innovation
          azmera: '#EC4899',   // Pink - Relationships, community
          chico: '#F59E0B',    // Orange - Investments, finance
        },
        
        // Skill Category Colors
        skill: {
          money: '#10B981',    // Green - Financial skills
          practical: '#F59E0B', // Orange - Hands-on skills
          digital: '#3B82F6',  // Blue - Digital skills
          trading: '#EF4444',  // Red - Trading skills
        },
        
        // Priority Colors
        priority: {
          low: '#10B981',      // Green - Low priority
          medium: '#F59E0B',   // Orange - Medium priority  
          high: '#EF4444',     // Red - High priority
          urgent: '#DC2626',   // Dark Red - Urgent priority
        },
        
        // Neutral Colors
        neutral: {
          50: '#F8F9FA',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
        
        // Background Colors
        background: {
          primary: '#FFFFFF',
          secondary: '#F8F9FA',
          tertiary: '#F3F4F6',
        },
        
        // Text Colors
        text: {
          primary: '#2D5016',
          secondary: '#6B7280',
          tertiary: '#9CA3AF',
          inverse: '#FFFFFF',
        },
      },
      
      // Typography Scale
      fontSize: {
        'xs': ['12px', { lineHeight: '16px' }],
        'sm': ['14px', { lineHeight: '20px' }],
        'base': ['16px', { lineHeight: '24px' }],
        'lg': ['18px', { lineHeight: '28px' }],
        'xl': ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '36px' }],
        '4xl': ['36px', { lineHeight: '40px' }],
        '5xl': ['48px', { lineHeight: '48px' }],
      },
      
      fontWeight: {
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
      },
      
      // Spacing Scale
      spacing: {
        '0': '0px',
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
        '32': '128px',
      },
      
      // Border Radius
      borderRadius: {
        'none': '0px',
        'sm': '4px',
        'DEFAULT': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
        'full': '9999px',
      },
      
      // Shadows
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      },
      
      // Animation
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'spin-slow': 'spin 3s linear infinite',
        'xp-glow': 'xpGlow 2s ease-in-out infinite',
        'level-up': 'levelUp 0.5s ease-out',
      },
      
      keyframes: {
        xpGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(245, 158, 11, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(245, 158, 11, 0.8)' },
        },
        levelUp: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.1)', opacity: '0.8' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      
      // Custom Gradients
      backgroundImage: {
        'mosa-gradient': 'linear-gradient(135deg, #D4A017 0%, #2D5016 100%)',
        'xp-gradient': 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        'success-gradient': 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        'venture-gradient': 'linear-gradient(135deg, var(--tw-gradient-from) 0%, var(--tw-gradient-to) 100%)',
      },
      
      // Custom Utilities
      zIndex: {
        'dropdown': '1000',
        'sticky': '1020',
        'fixed': '1030',
        'modal-backdrop': '1040',
        'modal': '1050',
        'popover': '1060',
        'tooltip': '1070',
        'toast': '1080',
      },
    },
  },
  
  // Variants
  variants: {
    extend: {
      opacity: ['disabled'],
      backgroundColor: ['active', 'disabled'],
      textColor: ['active', 'disabled'],
      borderColor: ['active', 'disabled'],
      scale: ['active', 'group-hover'],
    },
  },
  
  plugins: [
    // Custom plugin for Mosa-specific utilities
    function({ addUtilities, theme }) {
      const newUtilities = {
        // XP Badge utility
        '.xp-badge': {
          backgroundColor: theme('colors.xp'),
          color: theme('colors.white'),
          paddingLeft: theme('spacing.2'),
          paddingRight: theme('spacing.2'),
          paddingTop: theme('spacing.1'),
          paddingBottom: theme('spacing.1'),
          borderRadius: theme('borderRadius.full'),
          fontSize: theme('fontSize.xs'),
          fontWeight: theme('fontWeight.bold'),
        },
        
        // Venture card utility
        '.venture-card': {
          backgroundColor: theme('colors.background.primary'),
          borderRadius: theme('borderRadius.lg'),
          padding: theme('spacing.4'),
          shadowColor: theme('colors.neutral.900'),
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 3,
        },
        
        // Skill progress utility
        '.skill-progress': {
          height: '8px',
          backgroundColor: theme('colors.neutral.200'),
          borderRadius: theme('borderRadius.full'),
          overflow: 'hidden',
        },
        
        '.skill-progress-fill': {
          height: '100%',
          backgroundColor: theme('colors.success'),
          borderRadius: theme('borderRadius.full'),
        },
        
        // Gamification text glow
        '.text-glow': {
          textShadow: '0 0 10px rgba(245, 158, 11, 0.5)',
        },
      }
      
      addUtilities(newUtilities, ['responsive', 'hover'])
    }
  ],
  
  // Safelist for dynamic classes
  safelist: [
    // Venture colors
    'bg-venture-mosa',
    'bg-venture-yachi', 
    'bg-venture-chereka',
    'bg-venture-sifr',
    'bg-venture-azmera',
    'bg-venture-chico',
    
    // Skill colors
    'bg-skill-money',
    'bg-skill-practical',
    'bg-skill-digital', 
    'bg-skill-trading',
    
    // Priority colors
    'bg-priority-low',
    'bg-priority-medium',
    'bg-priority-high',
    'bg-priority-urgent',
    
    // Text colors for ventures
    'text-venture-mosa',
    'text-venture-yachi',
    'text-venture-chereka',
    'text-venture-sifr', 
    'text-venture-azmera',
    'text-venture-chico',
  ],
}