import React, { useState, useRef, useEffect, useCallback } from 'react';
import gsap from 'gsap';
import CardSwap, { Card } from '../../components/card-swap/CardSwap';
import './home.css';

export default function Home() {
    const carouselRef = useRef<HTMLDivElement>(null);
    const [activeSlide, setActiveSlide] = useState(0);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const startScrollLeft = useRef(0);
    const scrollTimeout = useRef<number | null>(null);
    const autoplayTimer = useRef<number | null>(null);

    const stopAutoplay = useCallback(() => {
        if (autoplayTimer.current) {
            window.clearInterval(autoplayTimer.current);
            autoplayTimer.current = null;
        }
    }, []);

    const startAutoplay = useCallback(() => {
        stopAutoplay();
        autoplayTimer.current = window.setInterval(() => {
            if (isDragging.current) return;
            setActiveSlide((prev) => {
                const next = prev + 1;
                if (carouselRef.current) {
                    const slideWidth = carouselRef.current.clientWidth || window.innerWidth;
                    carouselRef.current.style.scrollBehavior = 'smooth';
                    carouselRef.current.scrollTo({
                        left: (next + 1) * slideWidth,
                        behavior: 'smooth'
                    });
                }
                return next % 3;
            });
        }, 4000);
    }, [stopAutoplay]);

    const heroRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (carouselRef.current) {
            const slideWidth = carouselRef.current.clientWidth || window.innerWidth;
            carouselRef.current.scrollLeft = slideWidth; // Start at index 1 (Slide 1)
        }
        startAutoplay();

        const handleWindowScroll = () => {
            if (heroRef.current) {
                const scrollY = window.scrollY;
                // Fade out hero over 450px of scroll
                const opacity = Math.max(0, 1 - scrollY / 450);
                // Parallax translation
                const translateY = scrollY * 0.35;
                heroRef.current.style.opacity = opacity.toString();
                heroRef.current.style.transform = `translateY(${translateY}px)`;
                
                if (opacity === 0) {
                    heroRef.current.style.pointerEvents = 'none';
                } else {
                    heroRef.current.style.pointerEvents = 'auto';
                }
            }
        };

        window.addEventListener('scroll', handleWindowScroll, { passive: true });
        handleWindowScroll(); // Initial call

        return () => {
            stopAutoplay();
            window.removeEventListener('scroll', handleWindowScroll);
            if (scrollTimeout.current) {
                window.clearTimeout(scrollTimeout.current);
            }
        };
    }, [startAutoplay, stopAutoplay]);

    useEffect(() => {
        if (window.scrollY === 0 && heroRef.current) {
            gsap.fromTo(heroRef.current,
                { opacity: 0, y: 30 },
                { opacity: 1, y: 0, duration: 1.5, ease: 'power3.out' }
            );
        }
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.remove('is-hidden');
                    } else {
                        entry.target.classList.add('is-hidden');
                    }
                });
            },
            {
                threshold: 0.05,
                rootMargin: '-8% 0px -8% 0px'
            }
        );

        const targets = document.querySelectorAll('.scroll-fade');
        targets.forEach((t) => observer.observe(t));

        return () => {
            targets.forEach((t) => observer.unobserve(t));
        };
    }, []);

    const handleScroll = () => {
        if (!carouselRef.current) return;
        const container = carouselRef.current;
        const width = container.clientWidth;
        const scrollLeft = container.scrollLeft;

        if (scrollTimeout.current) {
            window.clearTimeout(scrollTimeout.current);
        }

        const index = Math.round(scrollLeft / width);
        const activeIdx = index === 0 ? 2 : index === 4 ? 0 : index - 1;
        setActiveSlide(activeIdx);

        // Perform infinite wrap check only after scrolling has completely stopped
        scrollTimeout.current = window.setTimeout(() => {
            if (!carouselRef.current || isDragging.current) return;
            const finalContainer = carouselRef.current;
            const finalWidth = finalContainer.clientWidth;
            const finalIndex = Math.round(finalContainer.scrollLeft / finalWidth);

            if (finalIndex === 0) {
                finalContainer.style.scrollBehavior = 'auto';
                finalContainer.scrollLeft = 3 * finalWidth;
            } else if (finalIndex === 4) {
                finalContainer.style.scrollBehavior = 'auto';
                finalContainer.scrollLeft = 1 * finalWidth;
            }
        }, 150);
    };

    const scrollToIndex = (index: number) => {
        if (carouselRef.current) {
            const slideWidth = carouselRef.current.clientWidth || window.innerWidth;
            carouselRef.current.style.scrollBehavior = 'smooth';
            carouselRef.current.scrollTo({
                left: (index + 1) * slideWidth,
                behavior: 'smooth'
            });
            setActiveSlide(index);
            startAutoplay(); // Reset autoplay timer
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!carouselRef.current) return;
        stopAutoplay(); // Pause autoplay during drag
        isDragging.current = true;
        startX.current = e.clientX;
        startScrollLeft.current = carouselRef.current.scrollLeft;
        
        carouselRef.current.style.scrollSnapType = 'none';
        carouselRef.current.style.scrollBehavior = 'auto';
        carouselRef.current.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging.current || !carouselRef.current) return;
        e.preventDefault();
        const dx = e.clientX - startX.current;
        carouselRef.current.scrollLeft = startScrollLeft.current - dx;
    };

    const handleMouseUpOrLeave = () => {
        if (!isDragging.current || !carouselRef.current) return;
        isDragging.current = false;
        
        const container = carouselRef.current;
        container.style.cursor = 'grab';
        container.style.scrollSnapType = 'x mandatory';
        container.style.scrollBehavior = 'smooth';
        
        const slideWidth = container.clientWidth;
        const nearestIndex = Math.round(container.scrollLeft / slideWidth);
        container.scrollTo({
            left: nearestIndex * slideWidth,
            behavior: 'smooth'
        });

        startAutoplay(); // Resume autoplay after drag
    };

    const handleScrollToMission = () => {
        const target = document.getElementById('about');
        if (target) {
            const rect = target.getBoundingClientRect();
            const absoluteTop = rect.top + window.scrollY;
            const offset = 100; // Account for fixed navbar and spacing
            window.scrollTo({
                top: absoluteTop - offset,
                behavior: 'smooth'
            });
        }
    };

    return (
        <main className="home-container">
            <section className="hero-section" ref={heroRef} style={{ opacity: 0 }}>
                <div className="hero-logo-wrapper">
                    <img
                        src="/images/ISAAC-Hero.png"
                        alt="ISAAC"
                        className="hero-logo-img"
                        draggable={false}
                    />
                </div>
                <div className="hero-moon-wrapper">
                    <img
                        src="/images/Moon-Hero.png"
                        alt="Moon"
                        className="hero-moon-img"
                        draggable={false}
                    />
                </div>
            </section>

            <div className="home-gradient-wrapper">
                <section className="mission-section scroll-fade is-hidden" id="about">
                    <div className="mission-content">
                    <div className="mission-left">
                        <div className="nebula-card">
                            <img
                                src="/images/Our-Mission-bg.png"
                                alt="Nebula Background"
                                className="nebula-bg-img"
                                draggable={false}
                            />
                            <div className="logo-badge">
                                <img
                                    src="/logo/ISAAC logo.png"
                                    alt="ISAAC Logo"
                                    className="badge-logo-img"
                                    draggable={false}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="mission-right">
                        <h2 className="mission-title">OUR MISSION</h2>
                        <p className="mission-text">
                            To bridge the gap between isolated astronomy clubs and create a collaborative nationwide ecosystem.
                        </p>
                        <p className="mission-text">
                            <span className="cyan-highlight">ISAAC</span> focuses on shared learning, active collaboration, and resource accessibility to help the nation's youth grow academically.
                        </p>
                        <div className="mission-buttons">
                            <a href="#join" className="btn-join">Join Us</a>
                            <a href="#know" className="btn-know">Know More</a>
                        </div>
                    </div>
                </div>

                <div className="mission-stats-container">
                    <div className="stat-item">
                        <div className="stat-number">50+</div>
                        <div className="stat-label">MEMBER CLUBS</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-number">400+</div>
                        <div className="stat-label">STUDENT MEMBERS</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-number">12+</div>
                        <div className="stat-label">EVENTS ORGANIZED</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-number">6+</div>
                        <div className="stat-label">MONTHS OLD</div>
                    </div>
                </div>
            </section>

            <section className="events-section scroll-fade is-hidden">
                <div className="quote-container">
                    <p className="quote-text">
                        "Somewhere, something <span className="cyan-highlight">incredible</span> is waiting to be known"
                        <span className="quote-author"> -carl sagan</span>
                    </p>
                </div>

                <div className="events-split-container">
                    <div className="events-left">
                        <h2 className="events-title">
                            Recent <span className="cyan-highlight">Events</span>
                        </h2>

                        <p className="events-desc">
                            Explore our past activities, guest lectures, and student-led initiatives across astrophysics.
                        </p>

                        <a href="#events" className="view-all-link">
                            View All <span className="arrow-icon">→</span>
                        </a>
                    </div>

                    <div className="events-right">
                        <CardSwap
                            cardDistance={35}
                            verticalDistance={30}
                            delay={4000}
                            pauseOnHover={false}
                            width={300}
                            height={400}
                        >
                            <Card>
                                <img
                                    src="https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=800&q=80"
                                    alt="Messier Marathon"
                                    className="event-img"
                                    draggable={false}
                                />
                                <div className="event-overlay">
                                    <span className="event-tag">LIVESTREAM</span>
                                    <h3 className="event-card-title">MESSIER MARATHON</h3>
                                    <p className="event-date">18th April</p>
                                </div>
                            </Card>

                            <Card>
                                <img
                                    src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80"
                                    alt="Probing the Universe"
                                    className="event-img"
                                    draggable={false}
                                />
                                <div className="event-overlay">
                                    <span className="event-tag">SEMINAR</span>
                                    <h3 className="event-card-title">PROBING UNIVERSE</h3>
                                    <p className="event-date">07th February</p>
                                </div>
                            </Card>

                            <Card>
                                <img
                                    src="https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80"
                                    alt="Academia to Industry"
                                    className="event-img"
                                    draggable={false}
                                />
                                <div className="event-overlay">
                                    <span className="event-tag">WORKSHOP</span>
                                    <h3 className="event-card-title">ACADEMIA TO INDUSTRY</h3>
                                    <p className="event-date">20th June</p>
                                </div>
                            </Card>

                            <Card>
                                <img
                                    src="https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=800&q=80"
                                    alt="Black Holes"
                                    className="event-img"
                                    draggable={false}
                                />
                                <div className="event-overlay">
                                    <span className="event-tag">TALK</span>
                                    <h3 className="event-card-title">BLACK HOLES</h3>
                                    <p className="event-date">18th December</p>
                                </div>
                            </Card>
                        </CardSwap>
                    </div>
                </div>
            </section>

            <section className="gallery-carousel-section scroll-fade is-hidden">
                <div className="gallery-header-container">
                    <div className="gallery-header-left">
                        <h2 className="gallery-title">
                            Astronomy Picture of the <span className="cyan-highlight">Month</span>
                        </h2>
                        <p className="gallery-subtitle">captured by our members</p>
                    </div>
                    <a href="#gallery" className="gallery-browse-link">
                        Browse our <span className="cyan-highlight">Gallery</span> <span className="arrow-icon">→</span>
                    </a>
                </div>

                <div 
                    ref={carouselRef} 
                    className="gallery-carousel-viewport"
                    onScroll={handleScroll}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUpOrLeave}
                    onMouseLeave={handleMouseUpOrLeave}
                >
                    {/* Slide 3 (Clone) */}
                    <div className="gallery-grid-slide">
                        <div className="gallery-grid-large">
                            <img 
                                src="https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80" 
                                alt="Eagle Nebula Clone" 
                                className="gallery-grid-img" 
                                draggable={false}
                            />
                        </div>
                        <div className="gallery-grid-item small-1">
                            <img 
                                src="https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=600&q=80" 
                                alt="Galaxy" 
                                className="gallery-grid-img" 
                                draggable={false}
                            />
                        </div>
                        <div className="gallery-grid-item small-2">
                            <img 
                                src="https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=600&q=80" 
                                alt="Constellations" 
                                className="gallery-grid-img" 
                                draggable={false}
                            />
                        </div>
                        <div className="gallery-grid-item small-3">
                            <img 
                                src="https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?auto=format&fit=crop&w=600&q=80" 
                                alt="Star Trails" 
                                className="gallery-grid-img" 
                                draggable={false}
                            />
                        </div>
                        <div className="gallery-grid-item small-4">
                            <img 
                                src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80" 
                                alt="Deep Space" 
                                className="gallery-grid-img" 
                                draggable={false}
                            />
                        </div>
                    </div>

                    {/* Slide 1 */}
                    <div className="gallery-grid-slide">
                        <div className="gallery-grid-large">
                            <img 
                                src="https://images.unsplash.com/photo-1454789548928-9efd52dc4031?auto=format&fit=crop&w=1200&q=80" 
                                alt="Sombrero Galaxy" 
                                className="gallery-grid-img" 
                                draggable={false}
                            />
                        </div>
                        <div className="gallery-grid-item small-1">
                            <img 
                                src="https://images.unsplash.com/photo-1502134249126-9f3755a50d78?auto=format&fit=crop&w=600&q=80" 
                                alt="Nebula" 
                                className="gallery-grid-img" 
                                draggable={false}
                            />
                        </div>
                        <div className="gallery-grid-item small-2">
                            <img 
                                src="https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?auto=format&fit=crop&w=600&q=80" 
                                alt="Comet" 
                                className="gallery-grid-img" 
                                draggable={false}
                            />
                        </div>
                        <div className="gallery-grid-item small-3">
                            <img 
                                src="https://images.unsplash.com/photo-1532693322450-2cb5c511067d?auto=format&fit=crop&w=600&q=80" 
                                alt="Moon" 
                                className="gallery-grid-img" 
                                draggable={false}
                            />
                        </div>
                        <div className="gallery-grid-item small-4">
                            <img 
                                src="https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=600&q=80" 
                                alt="Milky Way" 
                                className="gallery-grid-img" 
                                draggable={false}
                            />
                        </div>
                    </div>

                    {/* Slide 2 */}
                    <div className="gallery-grid-slide">
                        <div className="gallery-grid-large">
                            <img 
                                src="https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?auto=format&fit=crop&w=1200&q=80" 
                                alt="Sun Flare" 
                                className="gallery-grid-img" 
                                draggable={false}
                            />
                        </div>
                        <div className="gallery-grid-item small-1">
                            <img 
                                src="https://images.unsplash.com/photo-1614313913007-2b4ae8ce32d6?auto=format&fit=crop&w=600&q=80" 
                                alt="Planets" 
                                className="gallery-grid-img" 
                                draggable={false}
                            />
                        </div>
                        <div className="gallery-grid-item small-2">
                            <img 
                                src="https://images.unsplash.com/photo-1543722530-d2c3201371e7?auto=format&fit=crop&w=600&q=80" 
                                alt="Supernova" 
                                className="gallery-grid-img" 
                                draggable={false}
                            />
                        </div>
                        <div className="gallery-grid-item small-3">
                            <img 
                                src="https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=600&q=80" 
                                alt="Mars" 
                                className="gallery-grid-img" 
                                draggable={false}
                            />
                        </div>
                        <div className="gallery-grid-item small-4">
                            <img 
                                src="https://images.unsplash.com/photo-1529963183134-61a90db47eaf?auto=format&fit=crop&w=600&q=80" 
                                alt="Aurora" 
                                className="gallery-grid-img" 
                                draggable={false}
                            />
                        </div>
                    </div>

                    {/* Slide 3 */}
                    <div className="gallery-grid-slide">
                        <div className="gallery-grid-large">
                            <img 
                                src="https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80" 
                                alt="Eagle Nebula" 
                                className="gallery-grid-img" 
                                draggable={false}
                            />
                        </div>
                        <div className="gallery-grid-item small-1">
                            <img 
                                src="https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=600&q=80" 
                                alt="Galaxy" 
                                className="gallery-grid-img" 
                                draggable={false}
                            />
                        </div>
                        <div className="gallery-grid-item small-2">
                            <img 
                                src="https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=600&q=80" 
                                alt="Constellations" 
                                className="gallery-grid-img" 
                                draggable={false}
                            />
                        </div>
                        <div className="gallery-grid-item small-3">
                            <img 
                                src="https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?auto=format&fit=crop&w=600&q=80" 
                                alt="Star Trails" 
                                className="gallery-grid-img" 
                                draggable={false}
                            />
                        </div>
                        <div className="gallery-grid-item small-4">
                            <img 
                                src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80" 
                                alt="Deep Space" 
                                className="gallery-grid-img" 
                                draggable={false}
                            />
                        </div>
                    </div>

                    {/* Slide 1 (Clone) */}
                    <div className="gallery-grid-slide">
                        <div className="gallery-grid-large">
                            <img 
                                src="https://images.unsplash.com/photo-1454789548928-9efd52dc4031?auto=format&fit=crop&w=1200&q=80" 
                                alt="Sombrero Galaxy Clone" 
                                className="gallery-grid-img" 
                                draggable={false}
                            />
                        </div>
                        <div className="gallery-grid-item small-1">
                            <img 
                                src="https://images.unsplash.com/photo-1502134249126-9f3755a50d78?auto=format&fit=crop&w=600&q=80" 
                                alt="Nebula" 
                                className="gallery-grid-img" 
                                draggable={false}
                            />
                        </div>
                        <div className="gallery-grid-item small-2">
                            <img 
                                src="https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?auto=format&fit=crop&w=600&q=80" 
                                alt="Comet" 
                                className="gallery-grid-img" 
                                draggable={false}
                            />
                        </div>
                        <div className="gallery-grid-item small-3">
                            <img 
                                src="https://images.unsplash.com/photo-1532693322450-2cb5c511067d?auto=format&fit=crop&w=600&q=80" 
                                alt="Moon" 
                                className="gallery-grid-img" 
                                draggable={false}
                            />
                        </div>
                        <div className="gallery-grid-item small-4">
                            <img 
                                src="https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=600&q=80" 
                                alt="Milky Way" 
                                className="gallery-grid-img" 
                                draggable={false}
                            />
                        </div>
                    </div>
                </div>

                <div className="gallery-nav-dots">
                    {[0, 1, 2].map((idx) => (
                        <button
                            key={idx}
                            className={`nav-dot ${activeSlide === idx ? 'active' : ''}`}
                            onClick={() => scrollToIndex(idx)}
                            aria-label={`Go to slide ${idx + 1}`}
                            type="button"
                        />
                    ))}
                </div>
            </section>
        </div>

        <section className="newsletter-section scroll-fade is-hidden" id="newsletter">
                <div className="newsletter-container">
                    <div className="newsletter-left">
                        <div className="newsletter-cover-wrapper">
                            <img
                                src="/images/ISAAC_nl1_coverpage 1.png"
                                alt="Echoes in the Void Cover"
                                className="newsletter-cover-img"
                                draggable={false}
                            />
                        </div>
                    </div>
                    <div className="newsletter-right">
                        <div className="newsletter-glass-panel">
                            <img
                                src="/images/astronaut.png"
                                alt="Floating Astronaut"
                                className="newsletter-astronaut"
                                draggable={false}
                            />
                            <div className="newsletter-content-wrapper">
                                <h2 className="newsletter-title">
                                    ECHOES IN THE <span className="cyan-highlight">VOID</span>
                                </h2>
                                <h3 className="newsletter-subtitle">
                                    THE MONTHLY ISAAC <span className="cyan-highlight lowercase">newsletter</span>
                                </h3>
                                <p className="newsletter-text">
                                    Step into the ever expanding universe with the ISAAC Monthly Newsletter.
                                </p>
                                <p className="newsletter-text">
                                    Each edition features the latest news from the world of astronomy and astrophysics, exciting events, remarkable discoveries, and engaging stories from astronomy clubs across the country.
                                </p>
                                <p className="newsletter-text">
                                    Whether you are an avid observer, a student, or simply fascinated by the night sky, our newsletter is your invitation to explore, learn, and celebrate the spirit of astronomy with enthusiasts from all across India.
                                </p>
                                <div className="newsletter-buttons">
                                    <button className="btn-subscribe" type="button">Subscribe Now!</button>
                                    <button className="btn-view-all" type="button">View All</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <button 
                className="scroll-indicator" 
                onClick={handleScrollToMission}
                type="button"
                aria-label="Scroll to Know More"
            >
                <div className="scroll-pill">
                    Scroll to Know More
                </div>
                <div className="scroll-arrows">
                    <span className="arrow-down first"></span>
                    <span className="arrow-down second"></span>
                </div>
            </button>
        </main>
    );
}
