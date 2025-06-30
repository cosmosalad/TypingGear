import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const TypingSession = () => {
  const navigate = useNavigate();
  const { mode, language } = useParams(); // words/sentences, en/kr
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [currentTexts, setCurrentTexts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errors, setErrors] = useState(0);
  const [totalCharacters, setTotalCharacters] = useState(0);

  // 데이터 로딩 (기존 패턴 활용)
  useEffect(() => {
    if (language && mode) {
      import(`../data/${language}/${mode}.json`)
        .then(module => {
          setCategories(module.default.categories);
        })
        .catch(error => console.error('Error loading JSON:', error));
    }
  }, [language, mode]);

  // WPM 계산 (기존 CPM 로직 참고)
  const calculateStats = useCallback(() => {
    if (startTime && currentTexts.length > 0) {
      const now = Date.now();
      const timeElapsed = (now - startTime) / 60000; // 분 단위
      
      let completedChars = 0;
      for (let i = 0; i < currentIndex; i++) {
        const text = mode === 'sentences' ? currentTexts[i].text : currentTexts[i];
        completedChars += text.length;
      }
      completedChars += userInput.length;

      const wordsTyped = completedChars / 5; // 평균 단어 길이 5글자
      const currentWpm = timeElapsed > 0 ? Math.round(wordsTyped / timeElapsed) : 0;
      
      const currentAccuracy = totalCharacters > 0 ? Math.round(((totalCharacters - errors) / totalCharacters) * 100) : 100;
      
      return { wpm: currentWpm, accuracy: currentAccuracy };
    }
    return { wpm: 0, accuracy: 100 };
  }, [startTime, currentTexts, currentIndex, userInput, mode, errors, totalCharacters]);

  // 실시간 통계 업데이트 (기존 패턴)
  useEffect(() => {
    if (startTime && !isCompleted) {
      const interval = setInterval(() => {
        const stats = calculateStats();
        setWpm(stats.wpm);
        setAccuracy(stats.accuracy);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [calculateStats, startTime, isCompleted]);

  // 카테고리 선택
  const handleCategorySelect = useCallback((category) => {
    setSelectedCategory(category);
    if (mode === 'sentences') {
      setCurrentTexts(category.sentences);
    } else {
      setCurrentTexts(category.words);
    }
    resetPractice();
  }, [mode]);

  // 연습 초기화
  const resetPractice = useCallback(() => {
    setUserInput('');
    setCurrentIndex(0);
    setIsCompleted(false);
    setStartTime(null);
    setWpm(0);
    setAccuracy(100);
    setErrors(0);
    setTotalCharacters(0);
  }, []);

  // 입력 처리 (기존 패턴)
  const handleInputChange = useCallback((e) => {
    const input = e.target.value;
    if (!startTime) {
      setStartTime(Date.now());
    }

    const currentText = mode === 'sentences' ? currentTexts[currentIndex]?.text : currentTexts[currentIndex];
    
    // 오타 체크
    if (input.length <= currentText.length) {
      setUserInput(input);
      
      // 에러 카운트
      let newErrors = errors;
      if (input.length > 0 && input[input.length - 1] !== currentText[input.length - 1]) {
        newErrors = errors + 1;
        setErrors(newErrors);
      }
      setTotalCharacters(totalCharacters + 1);
    }
  }, [startTime, currentTexts, currentIndex, mode, errors, totalCharacters]);

  // 텍스트 완성 체크
  const checkCompletion = useCallback(() => {
    const currentText = mode === 'sentences' ? currentTexts[currentIndex]?.text : currentTexts[currentIndex];
    
    if (userInput === currentText) {
      if (currentIndex < currentTexts.length - 1) {
        setCurrentIndex(prevIndex => prevIndex + 1);
        setUserInput('');
      } else {
        setIsCompleted(true);
      }
      return true;
    }
    return false;
  }, [userInput, currentTexts, currentIndex, mode]);

  // 키보드 이벤트 (기존 패턴)
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || (e.key === ' ' && checkCompletion())) {
      e.preventDefault();
      checkCompletion();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setUserInput('');
    }
  }, [checkCompletion]);

  // 뒤로 가기 (기존 패턴)
  const handleGoBack = useCallback(() => {
    if (selectedCategory) {
      setSelectedCategory(null);
      setCurrentTexts([]);
      resetPractice();
    } else {
      navigate('/');
    }
  }, [selectedCategory, resetPractice, navigate]);

  // 현재 텍스트 렌더링 (기존 renderCurrentLine 패턴)
  const renderCurrentText = useCallback(() => {
    if (!currentTexts[currentIndex]) return null;
    
    const currentText = mode === 'sentences' ? currentTexts[currentIndex].text : currentTexts[currentIndex];
    
    return currentText.split('').map((char, index) => {
      let className = 'text-gray-800';
      
      if (index < userInput.length) {
        if (char === userInput[index]) {
          className = 'text-blue-500';
        } else {
          className = 'text-red-500 bg-red-100';
        }
      } else if (index === userInput.length) {
        className = 'text-gray-800 bg-blue-200';
      }

      return (
        <span key={index} className={className}>
          {char}
        </span>
      );
    });
  }, [currentTexts, currentIndex, userInput, mode]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-100 p-4">
      {/* 카테고리 선택 화면 */}
      {!selectedCategory && (
        <>
          <h1 className="text-3xl font-bold mb-8 text-gray-800">
            {mode === 'words' ? '단어 연습' : '문장 연습'} - {language === 'en' ? 'English' : '한국어'}
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 animate-fade-in">
            {categories.map((category, index) => (
              <button
                key={index}
                onClick={() => handleCategorySelect(category)}
                className="bg-white hover:bg-blue-100 text-blue-800 font-semibold py-6 px-6 border border-blue-400 rounded-lg shadow transition duration-300 ease-in-out transform hover:scale-105 active:scale-95"
              >
                <h2 className="text-xl">{category.name}</h2>
                <p className="text-sm text-gray-600 mt-2">
                  {mode === 'sentences' ? `${category.sentences.length}개 문장` : `${category.words.length}개 단어`}
                </p>
              </button>
            ))}
          </div>
        </>
      )}

      {/* 타이핑 연습 화면 */}
      {selectedCategory && !isCompleted && (
        <div className="w-full max-w-4xl">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">{selectedCategory.name}</h2>
            <div className="flex space-x-4 text-lg font-semibold">
              <span className="text-blue-600">속도: {wpm} WPM</span>
              <span className="text-green-600">정확도: {accuracy}%</span>
            </div>
          </div>

          <div className="mb-6 text-2xl leading-relaxed bg-white p-6 rounded-lg shadow">
            {renderCurrentText()}
          </div>

          {mode === 'sentences' && currentTexts[currentIndex]?.source && (
            <div className="mb-4 text-sm text-gray-600 italic text-center">
              출처: {currentTexts[currentIndex].source}
            </div>
          )}

          <div className="relative w-full mb-4">
            <input
              type="text"
              value={userInput}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="w-full p-4 text-xl border-2 border-blue-300 rounded-lg shadow focus:outline-none focus:border-blue-500"
              placeholder="여기에 입력하세요..."
              autoFocus
            />
          </div>

          <div className="text-center text-lg text-gray-600">
            진행률: {currentIndex + 1} / {currentTexts.length}
          </div>
        </div>
      )}

      {/* 완료 화면 */}
      {isCompleted && (
        <div className="w-full max-w-3xl bg-white p-8 rounded-lg shadow-lg text-center animate-fade-in">
          <h2 className="text-4xl font-bold mb-6 text-blue-600">
            연습 완료! 🎉
          </h2>
          <div className="grid grid-cols-2 gap-6 mb-8 text-xl">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-blue-600 font-bold text-3xl">{wpm}</div>
              <div className="text-blue-800">WPM</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-green-600 font-bold text-3xl">{accuracy}%</div>
              <div className="text-green-800">정확도</div>
            </div>
          </div>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => {
                setSelectedCategory(null);
                setCurrentTexts([]);
                resetPractice();
              }}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg shadow text-lg font-semibold transition duration-300 ease-in-out hover:bg-blue-600 hover:scale-105 active:scale-95"
            >
              다른 카테고리 선택
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-gray-100 text-blue-500 rounded-lg shadow text-lg font-semibold transition duration-300 ease-in-out hover:bg-gray-200 hover:scale-105 active:scale-95"
            >
              홈으로 돌아가기
            </button>
          </div>
        </div>
      )}

      {/* 뒤로 가기 버튼 */}
      {!isCompleted && (
        <button
          onClick={handleGoBack}
          className="mt-8 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-300 ease-in-out transform hover:scale-105 active:scale-95"
        >
          뒤로 가기
        </button>
      )}
    </div>
  );
};

export default TypingSession;