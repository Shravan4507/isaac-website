import Galaxy from './components/background/Galaxy'
import Navbar from './components/navbar/navbar'
import StaggeredMenu from './components/staggered-menu/StaggeredMenu'
import Home from './pages/home/home'
import './App.css'

const menuItems = [
  { label: 'About Us', ariaLabel: 'About Us', link: '#about' },
  { label: 'Publications', ariaLabel: 'Publications', link: '#publications' },
  { label: 'Membership', ariaLabel: 'Membership', link: '#membership' },
  { label: 'Science', ariaLabel: 'Science', link: '#science' },
  { label: 'Contact Us', ariaLabel: 'Contact Us', link: '#contact' },
  { label: 'Sign In', ariaLabel: 'Sign In', link: '#signin' }
];

const socialItems = [
  { label: 'Twitter', link: 'https://twitter.com' },
  { label: 'GitHub', link: 'https://github.com' },
  { label: 'LinkedIn', link: 'https://linkedin.com' }
];

function App() {
  return (
    <div className="app-container">
      <div className="desktop-navbar-wrapper">
        <Navbar />
      </div>

      <div className="mobile-menu-wrapper">
        <StaggeredMenu
          position="right"
          items={menuItems}
          socialItems={socialItems}
          displaySocials={true}
          displayItemNumbering={false}
          menuButtonColor="#ffffff"
          openMenuButtonColor="#000000"
          changeMenuColorOnOpen={true}
          colors={['#121214', '#1c1c22']}
          logoUrl="/logo/ISAAC logo.png"
          accentColor="#3b82f6"
          isFixed={true}
        />
      </div>

      <Home />

      <div className="background-wrapper">
        <Galaxy
          mouseRepulsion={false}
          mouseInteraction={false}
          density={0.3}
          glowIntensity={0.1}
          saturation={0}
          hueShift={80}
          twinkleIntensity={0.1}
          rotationSpeed={0}
          repulsionStrength={1.5}
          autoCenterRepulsion={0}
          starSpeed={0.3}
          speed={0.3}
        />
      </div>
    </div>
  )
}

export default App
