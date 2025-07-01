import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ReactTyped } from "react-typed";

const PracticeHome = () => {
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    return localStorage.getItem('selectedLanguage') || 'en';
  });

  const handleLanguageChange = (language) => {
    setSelectedLanguage(language);
    localStorage.setItem('selectedLanguage', language);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-100 p-4">
      <h1 className="text-4xl font-bold mb-8 h-16">
        <ReactTyped
          strings={["TypingGear", "타이핑 기어"]}
          typeSpeed={40}
          backSpeed={50}
          backDelay={10000}
          loop
        />
      </h1>

      <div className="mb-8 flex justify-center space-x-4">
        <button
          onClick={() => handleLanguageChange('en')}
          className={`px-6 py-3 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 active:scale-95 ${
            selectedLanguage === 'en' 
              ? 'bg-blue-500 text-white hover:bg-blue-600' 
              : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          🇺🇸 English
        </button>
        <button
          onClick={() => handleLanguageChange('kr')}
          className={`px-6 py-3 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 active:scale-95 ${
            selectedLanguage === 'kr' 
              ? 'bg-blue-500 text-white hover:bg-blue-600' 
              : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          🇰🇷 한국어
        </button>
      </div>

      {/* 타이핑 연습 시작 버튼 */}
      <div className="mb-8">
        <Link
          to={`/practice/${selectedLanguage}`}
          className="bg-white hover:bg-blue-50 text-blue-800 font-semibold py-8 px-12 border border-blue-400 rounded-lg shadow-lg transition duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl text-center block"
        >
          <h2 className="text-3xl mb-3">타이핑 연습 시작</h2>
          <p className="text-lg text-gray-600">
            {selectedLanguage === 'en' ? 'English' : '한국어'} 타이핑 연습
          </p>
        </Link>
      </div>

      <div className="text-center max-w-2xl">
        <h3 className="text-2xl font-semibold mb-4">사용 방법</h3>
        <ul className="text-left list-disc list-inside mb-6 space-y-2">
          <li>위에서 언어를 선택하세요 (English 또는 한국어)</li>
          <li>타이핑 연습 시작을 클릭하세요</li>
          <li>단어 또는 문장 모드를 선택하세요</li>
          <li>화면에 표시된 텍스트를 정확하게 입력하세요</li>
          <li>타이핑 속도와 정확도를 향상시켜보세요</li>
        </ul>
        
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-700">
            💡 <strong>팁:</strong> 정확도가 속도보다 중요합니다. 천천히 정확하게 타이핑하는 습관을 기르세요!
          </p>
        </div>
      </div>

      <div className="mt-8 text-sm text-gray-600">
        © 2024 TypingGear. All rights reserved.
      </div>
    </div>
  );
};

export default PracticeHome;