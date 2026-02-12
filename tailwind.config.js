/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#137fec',
        secondary: '#06b6d4',
        accent: '#d946ef',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
        
        // Background colors from existing design
        background: {
          light: '#f6f7f8',
          dark: '#101922',
          base: '#0f172a',
        },
        
        // Glass morphism colors
        glass: {
          surface: 'rgba(17, 20, 24, 0.4)',
          border: 'rgba(255, 255, 255, 0.1)',
          highlight: 'rgba(255, 255, 255, 0.05)',
          overlay: 'rgba(0, 0, 0, 0.5)',
        },
        
        // Surface colors for cards
        surface: {
          dark: '#1c252e',
          border: '#2d3748',
          hover: '#283039',
        },
        
        // Text colors
        text: {
          primary: '#ffffff',
          secondary: '#9dabb9',
          muted: '#6b7280',
        },
        
        // Status colors
        status: {
          active: '#10b981',
          idle: '#f59e0b',
          busy: '#ef4444',
          offline: '#6b7280',
        }
      },
      fontFamily: {
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'neon': '0 0 10px rgba(19, 127, 236, 0.5), 0 0 20px rgba(19, 127, 236, 0.3)',
        'neon-pink': '0 0 10px rgba(217, 70, 239, 0.5)',
        'neon-cyan': '0 0 10px rgba(6, 182, 212, 0.5)',
        'glass-inset': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
        'glass-card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'glass-card-hover': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      animation: {
        'spin-slow': 'spin 60s linear infinite',
        'spin-reverse': 'spin 80s linear infinite reverse',
        'pulse-glow': 'pulse-glow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'orbit': 'orbit 120s linear infinite',
        'gradient': 'gradient 8s ease infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { 
            opacity: '1', 
            boxShadow: '0 0 20px rgba(19, 127, 236, 0.5)' 
          },
          '50%': { 
            opacity: '0.7', 
            boxShadow: '0 0 10px rgba(19, 127, 236, 0.2)' 
          },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'orbit': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'gradient': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'tech-grid': 'linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)',
        'noise': 'url("/noise.svg")',
      },
      backdropBlur: {
        xs: '2px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      scale: {
        '98': '0.98',
        '102': '1.02',
      },
      cursor: {
        'grab': 'grab',
        'grabbing': 'grabbing',
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/container-queries'),
  ],
}