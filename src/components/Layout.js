
import './Layout.css';

const Layout = ({ children, currentPage }) => {
  return (
    <div className="app-layout">
      <header role="banner">
        <h1>HealthVis</h1>
        <nav role="navigation" aria-label="Skip navigation">
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
        </nav>
      </header>
      
      <main id="main-content" role="main" tabIndex="-1">
        {children}
      </main>
      
      <footer role="contentinfo">
        <p>HealthVis - Accessible Health Data Visualization</p>
      </footer>
    </div>
  );
};

export default Layout;