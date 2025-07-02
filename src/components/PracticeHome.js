import React from 'react';
import { Link } from 'react-router-dom';
import { ReactTyped } from "react-typed";

const PracticeHome = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-4xl font-bold mb-8 h-16 text-gray-800">
        <ReactTyped
          strings={["TypingGear", "타이핑 기어"]}
          typeSpeed={40}
          backSpeed={50}
          backDelay={10000}
          loop
        />
      </h1>

      {/* 타이핑 연습 시작 버튼 */}
      <div className="mb-8">
        <Link
          to="/practice"
          className="bg-white hover:bg-gray-50 text-gray-800 font-semibold py-8 px-12 border border-gray-300 rounded-lg shadow-lg transition duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl text-center block"
        >
          <h2 className="text-3xl mb-3 text-gray-800">타이핑 연습 시작</h2>
          <p className="text-lg text-gray-600">
            언어는 연습 화면에서 선택하세요
          </p>
        </Link>
      </div>

      <div className="mt-8 text-sm text-gray-500">
        © 2025 Cosmosalad. All rights reserved.
      </div>
    </div>
  );
};

export default PracticeHome;