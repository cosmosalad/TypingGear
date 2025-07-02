import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import Matter from 'matter-js';

// ======================================================================
// 기어의 시각적 요소를 SVG로 직접 그리는 컴포넌트
// ======================================================================
const GearSVG = React.memo(({ gear }) => {
  const { position, angle, radius, visual } = gear;
  const { color, strokeColor, teeth, holeRadius } = visual;

  // 기어의 톱니와 구멍 경로(path) 데이터(d 속성 값)를 생성하는 함수
  const generatePathData = () => {
    let path = '';
    const toothHeight = radius * 0.2;
    const toothInnerRadius = radius - toothHeight;
    const anglePerTooth = (2 * Math.PI) / teeth;

    // 1. 바깥쪽 톱니 경로 생성
    for (let i = 0; i < teeth; i++) {
      const baseAngle = i * anglePerTooth;
      const p1_angle = baseAngle + anglePerTooth * 0.1;
      const p2_angle = baseAngle + anglePerTooth * 0.4;
      const p3_angle = baseAngle + anglePerTooth * 0.6;
      const p4_angle = baseAngle + anglePerTooth * 0.9;
      
      const p1 = { x: radius * Math.cos(p1_angle), y: radius * Math.sin(p1_angle) };
      const p2 = { x: radius * Math.cos(p2_angle), y: radius * Math.sin(p2_angle) };
      const p3 = { x: toothInnerRadius * Math.cos(p3_angle), y: toothInnerRadius * Math.sin(p3_angle) };
      const p4 = { x: toothInnerRadius * Math.cos(p4_angle), y: toothInnerRadius * Math.sin(p4_angle) };

      if (i === 0) path += `M ${p1.x} ${p1.y} `;
      else path += `L ${p1.x} ${p1.y} `;
      path += `L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} L ${p4.x} ${p4.y} `;
    }
    path += 'Z '; // 바깥쪽 경로 닫기

    // 2. 안쪽 구멍 경로 생성
    const holeSegments = 32;
    for (let i = 0; i < holeSegments; i++) {
      const angle = (i / holeSegments) * (2 * Math.PI);
      const x = holeRadius * Math.cos(angle);
      const y = holeRadius * Math.sin(angle);
      if (i === 0) path += `M ${x} ${y} `;
      else path += `L ${x} ${y} `;
    }
    path += 'Z'; // 안쪽 경로 닫기

    return path;
  };

  if (!position) return null;

  const size = radius * 2.2; // 그림자 공간을 포함한 SVG 영역 크기
  const gradientId = `grad-${gear.id}`;
  const filterId = `shadow-${gear.id}`;
  
  const svgStyle = {
    position: 'absolute',
    width: size,
    height: size,
    left: position.x - size / 2,
    top: position.y - size / 2,
    transform: `rotate(${angle}rad)`,
    willChange: 'transform, left, top',
  };

  return (
    <svg style={svgStyle} viewBox={`-${size/2} -${size/2} ${size} ${size}`}>
      <defs>
        {/* 입체감을 위한 방사형 그라데이션 정의 */}
        <radialGradient id={gradientId} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" style={{stopColor: '#FFFFFF', stopOpacity: 0.3}} />
          <stop offset="60%" style={{stopColor: color, stopOpacity: 0.1}} />
          <stop offset="100%" style={{stopColor: color, stopOpacity: 1}} />
        </radialGradient>
        {/* 그림자 효과를 위한 필터 정의 */}
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* 기어 모양을 그리는 경로 */}
      <path 
        d={generatePathData()} 
        fill={`url(#${gradientId})`} 
        stroke={strokeColor} 
        strokeWidth="1.5"
        fillRule="evenodd" // 이 속성으로 구멍이 뚫림
        filter={`url(#${filterId})`}
      />
    </svg>
  );
});

const GearSystem = forwardRef((props, ref) => {
  const sceneRef = useRef(null);
  const engineRef = useRef(Matter.Engine.create());
  const [gears, setGears] = useState([]);
  const bodiesRef = useRef(new Map());

  useEffect(() => {
    const engine = engineRef.current;
    const container = sceneRef.current;
    engine.world.gravity.y = 0.6;

    const ground = Matter.Bodies.rectangle(container.clientWidth / 2, container.clientHeight + 60, container.clientWidth, 120, { isStatic: true });
    const leftWall = Matter.Bodies.rectangle(-60, container.clientHeight / 2, 120, container.clientHeight, { isStatic: true });
    const rightWall = Matter.Bodies.rectangle(container.clientWidth + 60, container.clientHeight / 2, 120, container.clientHeight, { isStatic: true });
    Matter.World.add(engine.world, [ground, leftWall, rightWall]);

    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);

    let animationFrameId;
    const gameLoop = () => {
      const updatedGears = [];
      for (const gear of bodiesRef.current.values()) {
        if (gear.position.y > container.clientHeight + 100) {
            Matter.World.remove(engine.world, gear);
            bodiesRef.current.delete(gear.id);
        } else {
            updatedGears.push({
                id: gear.id,
                position: gear.position,
                angle: gear.angle,
                radius: gear.circleRadius,
                visual: gear.visual,
            });
        }
      }
      setGears(updatedGears);
      animationFrameId = requestAnimationFrame(gameLoop);
    };
    gameLoop();

    return () => {
      cancelAnimationFrame(animationFrameId);
      Matter.Runner.stop(runner);
      Matter.World.clear(engine.world);
      Matter.Engine.clear(engine);
      bodiesRef.current.clear();
    };
  }, []);

  const addGear = () => {
    const container = sceneRef.current;
    if (!container) return;

    // 기어의 시각적 속성을 랜덤하게 결정
    const radius = Math.random() * 20 + 25;
    const teeth = Math.floor(Math.random() * 7) + 6; // 6 ~ 12개의 톱니
    const holeRadius = radius * (Math.random() * 0.4 + 0.3); // 30% ~ 70% 크기
    const colors = ['#B0B0B0', '#C0C0C0', '#D0D0D0', '#A0A0A0'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const strokeColor = '#505050';
    
    const visual = { color, strokeColor, teeth, holeRadius };
    
    const spawnX = Math.random() * (container.clientWidth - radius * 2) + radius;
    
    // 물리 계산용 원 객체 생성 (화면에는 보이지 않음)
    const body = Matter.Bodies.circle(spawnX, -50, radius, {
      restitution: 0.1,
      friction: 0.5,
      frictionAir: 0.05,
      density: 0.01,
      // 커스텀 데이터를 물리 객체에 저장
      visual: visual 
    });
    
    Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.4);
    Matter.World.add(engineRef.current.world, body);
    bodiesRef.current.set(body.id, body);
  };

  useImperativeHandle(ref, () => ({
    addGear
  }));

  return (
    <div
      ref={sceneRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden'
      }}
    >
      {gears.map(gear => (
        <GearSVG key={gear.id} gear={gear} />
      ))}
    </div>
  );
});

export default GearSystem;