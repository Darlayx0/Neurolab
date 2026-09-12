import React from 'react';

interface NeuroBrainVisualProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const NeuroBrainVisual: React.FC<NeuroBrainVisualProps> = ({
  className = '',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-16 h-16 sm:w-20 sm:h-20',
    md: 'w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28',
    lg: 'w-28 h-28 sm:w-36 sm:h-36',
  }[size];

  return (
    <div
      className={`relative flex items-center justify-center select-none pointer-events-none shrink-0 ${sizeClasses} ${className}`}
    >
      {/* 1. Cinematic Ambient Lighting & Volumetric Rim Glow (Soft Violet & Deep Indigo) */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-600/25 via-violet-500/30 to-fuchsia-400/20 blur-xl -z-10 animate-pulse" />
      <div className="absolute -inset-1 rounded-full bg-radial from-violet-400/15 via-indigo-500/10 to-transparent blur-md -z-10" />

      {/* 2. Hyper-Realistic 3D Octane-Style Translucent Neural Cortex SVG Illustration */}
      <svg
        viewBox="0 0 280 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_8px_20px_rgba(79,70,229,0.35)] overflow-visible"
      >
        <defs>
          {/* Volumetric Studio Translucent Cortex Gradient */}
          <radialGradient id="translucentCortexVolumetric" cx="44%" cy="36%" r="68%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="14%" stopColor="#ede9fe" stopOpacity="0.92" />
            <stop offset="35%" stopColor="#c4b5fd" stopOpacity="0.88" />
            <stop offset="58%" stopColor="#8b5cf6" stopOpacity="0.85" />
            <stop offset="82%" stopColor="#4c1d95" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.98" />
          </radialGradient>

          {/* Inner Glowing Synapse Core Gradient (Soft Violet to Bioluminescent Cyan/Electric Indigo) */}
          <radialGradient id="synapticCoreGlow" cx="48%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="25%" stopColor="#a78bfa" />
            <stop offset="60%" stopColor="#6366f1" />
            <stop offset="88%" stopColor="#4338ca" />
            <stop offset="100%" stopColor="#312e81" />
          </radialGradient>

          {/* Cinematic Studio Rim Light (Fuchsia & Violet Edge Ray) */}
          <linearGradient id="studioRimLight" x1="40" y1="20" x2="240" y2="180" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f472b6" stopOpacity="0.9" />
            <stop offset="35%" stopColor="#c084fc" stopOpacity="0.75" />
            <stop offset="70%" stopColor="#818cf8" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#4338ca" stopOpacity="0.2" />
          </linearGradient>

          {/* Cerebellum Multi-Layered Shading */}
          <linearGradient id="cerebellum3D" x1="140" y1="150" x2="220" y2="210" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#c4b5fd" />
            <stop offset="40%" stopColor="#7c3aed" />
            <stop offset="80%" stopColor="#4c1d95" />
            <stop offset="100%" stopColor="#1e1b4b" />
          </linearGradient>

          {/* Brainstem Volumetric Shading */}
          <linearGradient id="brainstem3D" x1="120" y1="170" x2="160" y2="230" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#5b21b6" />
            <stop offset="100%" stopColor="#1e1b4b" />
          </linearGradient>

          {/* Delicate Luminous Orbital Rings (Soft Violet & Deep Indigo) */}
          <linearGradient id="orbitRingGradient1" x1="10" y1="140" x2="270" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#c084fc" stopOpacity="0.9" />
            <stop offset="30%" stopColor="#818cf8" stopOpacity="0.7" />
            <stop offset="70%" stopColor="#a855f7" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.95" />
          </linearGradient>

          <linearGradient id="orbitRingGradient2" x1="30" y1="80" x2="250" y2="160" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#c084fc" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#e879f9" stopOpacity="0.85" />
          </linearGradient>

          {/* Glass Specular Caustics */}
          <linearGradient id="cortexSpecular" x1="70" y1="35" x2="165" y2="95" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Micro-particle Glow Spheres */}
          <radialGradient id="particleViolet" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#f472b6" />
            <stop offset="75%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#6b21a8" />
          </radialGradient>

          <radialGradient id="particleCyan" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#67e8f9" />
            <stop offset="75%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </radialGradient>

          {/* Blur Filters for Internal Neural Glow */}
          <filter id="synapseGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* --- BACK ORBITAL RING (Passing Behind Cerebrum) --- */}
        <ellipse
          cx="140"
          cy="120"
          rx="125"
          ry="44"
          transform="rotate(-15 140 120)"
          stroke="url(#orbitRingGradient1)"
          strokeWidth="1.6"
          strokeDasharray="5 3.5"
          opacity="0.55"
        />

        {/* Second Orbital Counter-Ring (Intersecting Orbit) */}
        <ellipse
          cx="140"
          cy="122"
          rx="118"
          ry="38"
          transform="rotate(22 140 122)"
          stroke="url(#orbitRingGradient2)"
          strokeWidth="1.2"
          strokeDasharray="4 4"
          opacity="0.4"
        />

        {/* --- 1. BRAINSTEM (Batang Otak / Medulla Oblongata & Pons) --- */}
        <g>
          <path
            d="M130 170 C130 188 134 206 138 222 C142 225 150 225 154 220 C153 204 150 186 148 168 Z"
            fill="url(#brainstem3D)"
          />
          {/* Stem Glow Veins */}
          <path
            d="M136 178 C138 192 142 206 144 216"
            stroke="#a78bfa"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.75"
          />
        </g>

        {/* --- 2. CEREBELLUM (Serebelum / Otak Kecil 3D) --- */}
        <g>
          <path
            d="M148 158 C160 152 180 150 198 154 C216 160 228 174 224 190 C220 204 202 214 182 212 C164 210 152 200 146 186 Z"
            fill="url(#cerebellum3D)"
            filter="drop-shadow(0 6px 14px rgba(30, 27, 75, 0.45))"
          />
          {/* Cerebellar Folia (Horizontal layered neural structures) */}
          <path
            d="M158 168 C174 163 194 164 212 172 M152 177 C172 172 196 174 216 183 M154 186 C170 182 192 184 210 193 M160 195 C174 192 190 194 202 201"
            stroke="#c4b5fd"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.6"
          />
        </g>

        {/* --- 3. INTERNAL GLOWING NEURAL SYNAPSES (Bioluminescent Core) --- */}
        <g filter="url(#synapseGlowFilter)">
          {/* Deep Synaptic Branching Network */}
          <path
            d="M92 90 Q115 105 138 98 T182 108"
            stroke="#c084fc"
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.85"
          />
          <path
            d="M110 70 Q122 92 142 118 T165 142"
            stroke="#818cf8"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.8"
          />
          <path
            d="M138 98 Q148 78 170 82 T200 92"
            stroke="#f472b6"
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.8"
          />
          <path
            d="M80 115 Q102 125 125 138 T155 148"
            stroke="#38bdf8"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.8"
          />
          <path
            d="M125 138 Q130 110 148 95"
            stroke="#e879f9"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.75"
          />

          {/* Synapse Intersection Nodes (Luminous Micro-Nodes) */}
          <circle cx="138" cy="98" r="4.5" fill="#ffffff" />
          <circle cx="138" cy="98" r="8" fill="#a855f7" opacity="0.6" />

          <circle cx="115" cy="105" r="3.5" fill="#67e8f9" />
          <circle cx="115" cy="105" r="6.5" fill="#3b82f6" opacity="0.5" />

          <circle cx="165" cy="112" r="3.8" fill="#ffffff" />
          <circle cx="165" cy="112" r="7" fill="#ec4899" opacity="0.55" />

          <circle cx="142" cy="118" r="3.2" fill="#ffffff" />
          <circle cx="142" cy="118" r="6" fill="#8b5cf6" opacity="0.5" />

          <circle cx="170" cy="82" r="3" fill="#ffffff" />
          <circle cx="170" cy="82" r="5.5" fill="#c084fc" opacity="0.5" />
        </g>

        {/* --- 4. TRANSLUCENT 3D NEURAL CORTEX (Octane Volume Mass) --- */}
        <path
          d="M80 62
             C60 68 44 90 46 114
             C48 130 58 142 68 148
             C70 158 80 166 94 170
             C108 174 126 170 138 162
             C146 165 154 167 162 165
             C182 167 204 157 218 146
             C232 134 238 114 236 94
             C232 70 212 46 184 40
             C162 36 142 42 126 40
             C104 36 92 48 80 62 Z"
          fill="url(#translucentCortexVolumetric)"
          filter="drop-shadow(0 10px 22px rgba(76, 29, 149, 0.4))"
        />

        {/* Rim Light Contour Layer (Cinematic Studio Edge Glow) */}
        <path
          d="M80 62
             C60 68 44 90 46 114
             C48 130 58 142 68 148
             C70 158 80 166 94 170
             C108 174 126 170 138 162
             C146 165 154 167 162 165
             C182 167 204 157 218 146
             C232 134 238 114 236 94
             C232 70 212 46 184 40
             C162 36 142 42 126 40
             C104 36 92 48 80 62 Z"
          stroke="url(#studioRimLight)"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />

        {/* --- 5. 3D CONVOLUTED SULCI & GYRI FOLDS (Deep Neural Grooves) --- */}
        {/* Sylvian / Lateral Sulcus */}
        <path
          d="M68 146 C88 144 114 134 138 136 C158 138 178 126 196 122"
          stroke="#2e1065"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.65"
        />
        <path
          d="M70 144 C90 142 114 132 138 134 C158 136 178 124 196 120"
          stroke="#ffffff"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.55"
        />

        {/* Central Sulcus */}
        <path
          d="M138 42 C132 60 134 78 128 96 C124 108 128 122 138 136"
          stroke="#3b0764"
          strokeWidth="3.6"
          strokeLinecap="round"
          opacity="0.6"
        />

        {/* Frontal Lobe Sulci Folds */}
        <path
          d="M92 52 C82 66 80 82 64 92 C56 98 58 112 68 118"
          stroke="#4c1d95"
          strokeWidth="3.2"
          strokeLinecap="round"
          opacity="0.55"
        />
        <path
          d="M106 66 C96 78 94 94 100 108 C104 116 102 126 96 134"
          stroke="#4c1d95"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d="M80 96 C90 102 96 114 84 126"
          stroke="#4c1d95"
          strokeWidth="2.8"
          strokeLinecap="round"
          opacity="0.5"
        />

        {/* Parietal & Occipital Lobe Sulci */}
        <path
          d="M162 46 C168 60 162 76 170 92 C178 102 190 104 200 100"
          stroke="#4c1d95"
          strokeWidth="3.2"
          strokeLinecap="round"
          opacity="0.55"
        />
        <path
          d="M190 58 C202 72 200 88 214 98 C224 104 222 118 214 128"
          stroke="#4c1d95"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d="M156 94 C168 104 166 118 176 124 C186 130 200 132 210 138"
          stroke="#4c1d95"
          strokeWidth="2.8"
          strokeLinecap="round"
          opacity="0.5"
        />

        {/* Temporal Lobe Folds */}
        <path
          d="M78 156 C92 160 108 156 124 150 C136 148 150 152 160 150"
          stroke="#4c1d95"
          strokeWidth="2.8"
          strokeLinecap="round"
          opacity="0.5"
        />

        {/* --- 6. SPECULAR 3D GLASS HIGHLIGHTS (Caustics on Gyri Crests) --- */}
        <path
          d="M90 54 C112 46 138 46 162 50 C182 56 202 66 214 82"
          stroke="url(#cortexSpecular)"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <path
          d="M58 88 C52 102 56 116 62 122"
          stroke="#ffffff"
          strokeWidth="2.6"
          strokeLinecap="round"
          opacity="0.75"
        />
        <ellipse cx="116" cy="80" rx="16" ry="7" transform="rotate(-22 116 80)" fill="url(#cortexSpecular)" />
        <ellipse cx="166" cy="84" rx="18" ry="8" transform="rotate(-15 166 84)" fill="url(#cortexSpecular)" />

        {/* --- 7. FRONT LUMINOUS ORBITAL RINGS & CIRCLING MICRO-PARTICLES --- */}
        {/* Front Ring 1 Arc (Cutting across the front in 3D perspective) */}
        <path
          d="M20 144 C54 174 126 188 206 164 C244 152 270 134 276 116"
          stroke="url(#orbitRingGradient1)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {/* Front Ring 2 Arc (Counter angle) */}
        <path
          d="M45 92 C88 128 172 152 245 138"
          stroke="url(#orbitRingGradient2)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeDasharray="6 4"
        />

        {/* Luminous Synaptic Micro-Particles Circling Cerebrum */}
        {/* Particle 1: Front Violet Spark */}
        <g filter="drop-shadow(0 2px 8px rgba(244, 114, 182, 0.75))">
          <circle cx="58" cy="160" r="7" fill="url(#particleViolet)" />
          <circle cx="56" cy="158" r="2.5" fill="#ffffff" opacity="0.95" />
        </g>

        {/* Particle 2: Front Cyan Energy Spark */}
        <g filter="drop-shadow(0 2px 8px rgba(56, 189, 248, 0.75))">
          <circle cx="236" cy="88" r="6.5" fill="url(#particleCyan)" />
          <circle cx="234" cy="86" r="2.2" fill="#ffffff" opacity="0.95" />
        </g>

        {/* Particle 3: Orbit Particle Accent */}
        <g filter="drop-shadow(0 2px 6px rgba(168, 85, 247, 0.7))">
          <circle cx="218" cy="158" r="4.5" fill="#c084fc" />
          <circle cx="217" cy="157" r="1.6" fill="#ffffff" />
        </g>

        {/* Particle 4: Floating Micro-Particle Orbit Accent */}
        <circle cx="102" cy="178" r="3" fill="#38bdf8" opacity="0.9" />
        <circle cx="101" cy="177" r="1.2" fill="#ffffff" />

        {/* Particle 5: Top Orbit Micro-Spark */}
        <circle cx="178" cy="34" r="2.8" fill="#f472b6" opacity="0.95" />
        <circle cx="177" cy="33" r="1" fill="#ffffff" />

        {/* Tiny Floating Micro-Dots (Cosmic Neural Dust) */}
        <circle cx="34" cy="118" r="1.5" fill="#c084fc" opacity="0.8" />
        <circle cx="254" cy="142" r="1.8" fill="#38bdf8" opacity="0.85" />
        <circle cx="120" cy="24" r="1.4" fill="#a78bfa" opacity="0.75" />
        <circle cx="248" cy="70" r="1.6" fill="#f472b6" opacity="0.8" />
      </svg>
    </div>
  );
};
