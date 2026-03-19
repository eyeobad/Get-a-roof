const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'landingpage', 'index.html');
const outPath = path.join(__dirname, 'frontend', 'src', 'app', 'landingpage', 'page.tsx');

let html = fs.readFileSync(htmlPath, 'utf8');

// Extract the main div
const match = html.match(/<div class="min-h-screen flex flex-col">([\s\S]*?)<\/div><script src=/);
if (!match) {
  console.log("Could not find main div");
  process.exit(1);
}

let content = match[1];
content = '<div className="min-h-screen flex flex-col">' + content + '</div>';

// Convert class to className
content = content.replace(/class="/g, 'className="');
content = content.replace(/for="/g, 'htmlFor="');

// Fix unclosed tags
content = content.replace(/<(img|input|br|source|col|hr)([^>]*?[^\/])>/g, '<$1$2 />');

// Camel case JSX attributes
content = content.replace(/stroke-width="/g, 'strokeWidth="');
content = content.replace(/stroke-linecap="/g, 'strokeLinecap="');
content = content.replace(/stroke-linejoin="/g, 'strokeLinejoin="');
content = content.replace(/fill-rule="/g, 'fillRule="');
content = content.replace(/clip-rule="/g, 'clipRule="');
content = content.replace(/playsinline="/g, 'playsInline="');
content = content.replace(/autoplay="/g, 'autoPlay="');
content = content.replace(/srcset="/g, 'srcSet="');

// Replace inline styles (basic regex, might need manual touchups if complex)
// e.g. style="position:absolute;height:100%;width:100%;left:0;top:0;right:0;bottom:0;color:transparent"
content = content.replace(/style="([^"]*)"/g, (match, styles) => {
  const parts = styles.split(';').filter(Boolean);
  const styleObj = {};
  parts.forEach(part => {
    let [key, value] = part.split(':').map(s => s.trim());
    if(!key) return;
    // camelCase key
    key = key.replace(/-([a-z])/g, g => g[1].toUpperCase());
    styleObj[key] = value;
  });
  return 'style={' + JSON.stringify(styleObj) + '}';
});

// Update asset paths
content = content.replace(/src="images\//g, 'src="/landingpage/images/');
content = content.replace(/srcset="images\//g, 'srcset="/landingpage/images/');
content = content.replace(/src="media\//g, 'src="/landingpage/media/');
content = content.replace(/poster="\/static\/images\//g, 'poster="/landingpage/images/');

// Replace "Sorce" with "Get a Roof"
content = content.replace(/Sorce/g, 'Get a Roof');
content = content.replace(/sorce/g, 'get a roof');
content = content.replace(/ founders@get a roof\.jobs/g, ' support@getaroof.com');
content = content.replace(/get a roof\.jobs/g, 'getaroof.com');

// Ensure correct React component wrapping
const pageTsx = `
"use client";

import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > window.innerHeight);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <div 
        dangerouslySetInnerHTML={{
          __html: \`<style>
            @import url('/landingpage/css/1e683c8e59511f69.css');
            @import url('/landingpage/css/7cca8e2c5137bd71.css');
            body { background: white; }
          </style>\`
        }} 
      />
      
      ${content}
    </>
  );
}
`;

fs.writeFileSync(outPath, pageTsx);
console.log("Successfully generated landingpage/page.tsx");
