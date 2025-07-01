import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const TypingSession = () => {
  const navigate = useNavigate();
  const { language } = useParams(); // en/kr
  const [mode, setMode] = useState('words'); // words 또는 sentences
  const [allTexts, setAllTexts] = useState([]); // 모든 카테고리의 텍스트들
  const [currentText, setCurrentText] = useState(''); // 현재 타이핑할 텍스트
  const [nextText, setNextText] = useState(''); // 다음 텍스트 (단어 모드에서만)
  const [userInput, setUserInput] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [cpm, setCpm] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // 랜덤 텍스트 선택 함수
  const getRandomText = useCallback((excludeCurrent = true) => {
    if (allTexts.length === 0) return '';
    
    let availableTexts = allTexts;
    if (excludeCurrent && allTexts.length > 1) {
      availableTexts = allTexts.filter(text => {
        const textContent = mode === 'sentences' ? text.text : text;
        return textContent !== currentText;
      });
    }
    
    const randomIndex = Math.floor(Math.random() * availableTexts.length);
    const selectedText = availableTexts[randomIndex];
    return mode === 'sentences' ? selectedText.text : selectedText;
  }, [allTexts, currentText, mode]);

  // 다음 텍스트 설정
  const setNextRandomText = useCallback(() => {
    const nextRandomText = getRandomText(true);
    setNextText(nextRandomText);
  }, [getRandomText]);

  // 데이터 로딩
  useEffect(() => {
    if (language && mode) {
      setIsLoading(true);
      import(`../data/${language}/${mode}.json`)
        .then(module => {
          const categories = module.default.categories;
          let texts = [];
          
          // 모든 카테고리의 텍스트를 하나의 배열로 합치기
          categories.forEach(category => {
            if (mode === 'sentences') {
              if (category.sentences && Array.isArray(category.sentences)) {
                texts = texts.concat(category.sentences);
              }
            } else {
              if (category.words && Array.isArray(category.words)) {
                texts = texts.concat(category.words);
              }
            }
          });
          
          setAllTexts(texts);
          
          // 첫 번째 랜덤 텍스트 설정
          if (texts.length > 0) {
            const firstText = mode === 'sentences' ? texts[0].text : texts[0];
            setCurrentText(firstText);
            
            // 다음 텍스트도 미리 설정 (단어 모드)
            if (mode === 'words' && texts.length > 1) {
              const secondText = texts[1];
              setNextText(secondText);
            }
          }
          
          resetPractice();
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Error loading JSON:', error);
          setIsLoading(false);
        });
    }
  }, [language, mode]);

  // 다음 텍스트 설정 (allTexts 변경 시)
  useEffect(() => {
    if (allTexts.length > 0 && currentText) {
      setNextRandomText();
    }
  }, [allTexts, currentText, setNextRandomText]);

  // 한글 자모 수 계산 함수
  const countKoreanCharacters = useCallback((text) => {
    if (!text || typeof text !== 'string') return 0;
    let count = 0;
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      if (charCode >= 0xAC00 && charCode <= 0xD7A3) {
        const syllableCode = charCode - 0xAC00;
        const jong = syllableCode % 28;
        count += jong === 0 ? 2 : 3;
      } else if ((charCode >= 0x3131 && charCode <= 0x314E) || (charCode >= 0x314F && charCode <= 0x3163)) {
        count += 1;
      } else {
        count += 1;
      }
    }
    return count;
  }, []);

  // CPM 계산
  const calculateCPM = useCallback(() => {
    if (startTime) {
      const now = Date.now();
      const timeElapsed = (now - startTime) / 60000;
      let totalCharacters = 0;

      if (language === 'kr') {
        totalCharacters = (completedCount * 5) + countKoreanCharacters(userInput); // 평균적으로 완성된 글자 수 추정
      } else {
        totalCharacters = (completedCount * 5) + userInput.length; // 평균 단어 길이 5글자
      }

      return timeElapsed > 0 ? Math.round(totalCharacters / timeElapsed) : 0;
    }
    return 0;
  }, [startTime, completedCount, userInput, language, countKoreanCharacters]);

  // 실시간 CPM 업데이트
  useEffect(() => {
    if (startTime) {
      const interval = setInterval(() => {
        setCpm(calculateCPM());
      }, 100);
      return () => clearInterval(interval);
    }
  }, [calculateCPM, startTime]);

  // 연습 초기화
  const resetPractice = useCallback(() => {
    setUserInput('');
    setStartTime(null);
    setCpm(0);
    setCompletedCount(0);
  }, []);

  // 모드 변경 시
  const handleModeChange = useCallback((newMode) => {
    setMode(newMode);
    setCurrentText('');
    setNextText('');
    resetPractice();
  }, [resetPractice]);

  // 입력 처리
  const handleInputChange = useCallback((e) => {
    const input = e.target.value;
    
    // 현재 텍스트 길이를 초과하지 않도록 제한
    if (currentText && input.length <= currentText.length) {
      if (!startTime) {
        setStartTime(Date.now());
      }
      setUserInput(input);
    }
  }, [startTime, currentText]);

  // 단어/문장 경계 찾기
  const findCurrentWordBoundaries = useCallback((text, cursorIndex) => {
    if (!text || typeof text !== 'string') return { start: 0, end: 0 };
    let start = cursorIndex;
    let end = cursorIndex;
    
    while (start > 0 && !/\s/.test(text[start - 1])) {
      start--;
    }
    
    while (end < text.length && !/\s/.test(text[end])) {
      end++;
    }
    
    return { start, end };
  }, []);

  // 현재 텍스트 렌더링
  const renderCurrentText = useCallback(() => {
    if (!currentText || typeof currentText !== 'string') return null;
    
    const { start: wordStart, end: wordEnd } = findCurrentWordBoundaries(currentText, userInput.length);

    return currentText.split('').map((char, index) => {
      let className = 'text-gray-800';
      let underline = false;

      if (index < userInput.length) {
        if (char === userInput[index]) {
          className = 'text-blue-500';
        } else {
          // 한글 작성 중일 때는 빨간색으로 표시하지 않음
          if (language === 'kr' && index === userInput.length - 1) {
            className = 'text-gray-800';
          } else {
            className = 'text-red-500 bg-red-100';
          }
        }
      } else if (index === userInput.length) {
        className = 'text-gray-800 bg-blue-200';
      }

      // 현재 단어에 밑줄 표시
      if (index >= wordStart && index < wordEnd && index >= userInput.length) {
        underline = true;
      }

      return (
        <span key={index} className={`relative ${className}`}>
          {char}
          {underline && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500"></span>
          )}
        </span>
      );
    });
  }, [currentText, userInput, language, findCurrentWordBoundaries]);

  // 다음 단어 표시 (단어 모드에서만)
  const renderNextWord = useCallback(() => {
    if (mode !== 'words' || !nextText) return null;
    
    return (
      <span className="text-gray-400 text-xl ml-4 opacity-50">
        {nextText}
      </span>
    );
  }, [mode, nextText]);

  // 텍스트 완성 체크
  const checkCompletion = useCallback(() => {
    if (currentText && userInput === currentText) {
      setCompletedCount(prev => prev + 1);
      
      if (mode === 'words' && nextText) {
        // 단어 모드: 옆에 보였던 다음 단어가 현재 단어가 됨
        setCurrentText(nextText);
        // 새로운 다음 단어 설정
        setNextRandomText();
      } else {
        // 문장 모드: 새로운 랜덤 텍스트
        const newCurrentText = getRandomText(true);
        setCurrentText(newCurrentText);
      }
      
      setUserInput('');
      return true;
    }
    return false;
  }, [userInput, currentText, mode, nextText, getRandomText, setNextRandomText]);

  // 키보드 이벤트
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      checkCompletion();
    } else if (e.key === ' ' && mode === 'words') {
      // 단어 모드에서 스페이스바로 다음 단어로 넘어가기
      e.preventDefault();
      checkCompletion();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setUserInput('');
    }
  }, [checkCompletion, mode]);

  // 뒤로 가기
  const handleGoBack = useCallback(() => {
    navigate('/');
  }, [navigate]);

  // 새로운 시작
  const handleRestart = useCallback(() => {
    if (allTexts.length > 0) {
      const newText = getRandomText(false);
      setCurrentText(newText);
      if (mode === 'words') {
        setNextRandomText();
      }
      resetPractice();
    }
  }, [allTexts, getRandomText, mode, setNextRandomText, resetPractice]);

  // 로딩 중 표시
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-blue-100 p-4">
        <div className="text-2xl text-gray-600">데이터를 불러오는 중...</div>
      </div>
    );
  }

  // 데이터가 없을 때
  if (allTexts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-blue-100 p-4">
        <div className="text-2xl text-gray-600 mb-4">데이터를 불러올 수 없습니다.</div>
        <button
          onClick={handleGoBack}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-300 ease-in-out transform hover:scale-105 active:scale-95"
        >
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-100 p-4">
      <div className="w-full max-w-4xl">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">
            타이핑 연습 - {language === 'en' ? 'English' : '한국어'}
          </h1>
          <div className="text-xl font-semibold text-gray-800">
            현재 속도: {cpm} CPM
          </div>
        </div>
        
        {/* 단어/문장 토글 버튼 */}
        <div className="mb-6 flex justify-center space-x-4">
          <button
            onClick={() => handleModeChange('words')}
            className={`px-6 py-3 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 active:scale-95 ${
              mode === 'words' 
                ? 'bg-green-500 text-white hover:bg-green-600' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            단어 연습
          </button>
          <button
            onClick={() => handleModeChange('sentences')}
            className={`px-6 py-3 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 active:scale-95 ${
              mode === 'sentences' 
                ? 'bg-green-500 text-white hover:bg-green-600' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            문장 연습
          </button>
        </div>

        <div className="mb-6 text-2xl leading-relaxed bg-white p-6 rounded-lg shadow flex items-center">
          {renderCurrentText()}
          {renderNextWord()}
        </div>

        <div className="relative w-full mb-4">
          <div className="absolute inset-0 bg-white border-2 border-blue-300 rounded-lg shadow"></div>
          <input
            type="text"
            value={userInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="relative w-full p-4 text-xl bg-transparent focus:outline-none"
            placeholder={mode === 'words' ? "단어를 입력하고 스페이스바나 엔터를 누르세요..." : "문장을 입력하고 엔터를 누르세요..."}
            autoFocus
          />
        </div>

        <div className="flex justify-between items-center text-lg text-gray-600">
          <span>완료한 개수: {completedCount}개</span>
          <button
            onClick={handleRestart}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition duration-300 ease-in-out transform hover:scale-105 active:scale-95"
          >
            다시 시작
          </button>
        </div>
      </div>

      {/* 뒤로 가기 버튼 */}
      <button
        onClick={handleGoBack}
        className="mt-8 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-300 ease-in-out transform hover:scale-105 active:scale-95"
      >
        홈으로 돌아가기
      </button>
    </div>
  );
};

export default TypingSession;