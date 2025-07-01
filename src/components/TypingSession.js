import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const TypingSession = () => {
  const navigate = useNavigate();
  const { language } = useParams(); // en/kr
  const [mode, setMode] = useState('words'); // words 또는 sentences
  const [wordTarget, setWordTarget] = useState(30); // 단어 목표 개수 (30, 50, 100)
  const [typingMode, setTypingMode] = useState('basic'); // basic 또는 overlay
  const [allTexts, setAllTexts] = useState([]); // 모든 카테고리의 텍스트들
  const [currentText, setCurrentText] = useState(''); // 현재 타이핑할 텍스트
  const [nextText, setNextText] = useState(''); // 다음 텍스트 (단어 모드에서만)
  const [userInput, setUserInput] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [cpm, setCpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [previousCpm, setPreviousCpm] = useState(0);
  const [previousAccuracy, setPreviousAccuracy] = useState(100);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCharacters, setTotalCharacters] = useState(0);
  const [correctCharacters, setCorrectCharacters] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false); // 목표 달성 완료

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
          
          // 모든 카테고리의 텍스트를 하나의 배열로 합치기 (원래 방식으로 복원)
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
            // 랜덤 인덱스 선택
            const randomIndex = Math.floor(Math.random() * texts.length);
            const firstText = mode === 'sentences' ? texts[randomIndex].text : texts[randomIndex];
            setCurrentText(firstText);
            
            // 다음 텍스트도 미리 설정 (단어 모드)
            if (mode === 'words' && texts.length > 1) {
              const nextRandomIndex = (randomIndex + 1) % texts.length;
              setNextText(texts[nextRandomIndex]);
            } else if (mode === 'sentences' && texts.length > 1) {
              const nextRandomIndex = (randomIndex + 1) % texts.length;
              setNextText(texts[nextRandomIndex].text);
            }
          }
          
          // 직접 상태 초기화
          setUserInput('');
          setStartTime(null);
          setCpm(0);
          setAccuracy(100);
          setCompletedCount(0);
          setPreviousCpm(0);
          setPreviousAccuracy(100);
          setTotalCharacters(0);
          setCorrectCharacters(0);
          setIsCompleted(false);
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

  // CPM 계산 (단어 모드는 전체 세션, 문장 모드는 현재 문장)
  const calculateCPM = useCallback(() => {
    if (startTime) {
      const now = Date.now();
      const timeElapsed = (now - startTime) / 60000;
      let characters = 0;

      if (mode === 'words') {
        // 단어 모드: 완료된 단어들 + 현재 입력 중인 글자
        let completedWordsChars = 0;
        // 완료된 단어들의 실제 글자 수 계산
        for (let i = 0; i < completedCount; i++) {
          completedWordsChars += 5; // 평균 단어 길이로 추정
        }
        
        if (language === 'kr') {
          characters = completedWordsChars + countKoreanCharacters(userInput);
        } else {
          characters = completedWordsChars + userInput.length;
        }
      } else {
        // 문장 모드: 현재 문장의 입력만
        if (language === 'kr') {
          characters = countKoreanCharacters(userInput);
        } else {
          characters = userInput.length;
        }
      }

      return timeElapsed > 0 ? Math.round(characters / timeElapsed) : 0;
    }
    return 0;
  }, [startTime, userInput, language, countKoreanCharacters, mode, completedCount]);

  // 정확도 계산
  const calculateAccuracy = useCallback(() => {
    if (mode === 'words') {
      // 단어 모드: 전체 세션의 정확도
      if (totalCharacters === 0) return 100;
      return Math.round((correctCharacters / totalCharacters) * 100);
    } else {
      // 문장 모드: 현재 입력 중인 텍스트의 정확도
      if (userInput.length === 0) return 100;
      let correct = 0;
      for (let i = 0; i < userInput.length; i++) {
        if (userInput[i] === currentText[i]) {
          correct++;
        }
      }
      return Math.round((correct / userInput.length) * 100);
    }
  }, [mode, totalCharacters, correctCharacters, userInput, currentText]);

  // 실시간 CPM 및 정확도 업데이트
  useEffect(() => {
    if (startTime && !isCompleted) { // 완료되지 않았을 때만 업데이트
      const interval = setInterval(() => {
        setCpm(calculateCPM());
        setAccuracy(calculateAccuracy());
      }, 100);
      return () => clearInterval(interval);
    }
  }, [calculateCPM, calculateAccuracy, startTime, isCompleted]);

  // 연습 초기화 (전체 리셋용)
  const resetPractice = useCallback(() => {
    setUserInput('');
    setStartTime(null);
    setCpm(0);
    setAccuracy(100);
    setCompletedCount(0);
    setPreviousCpm(0);
    setPreviousAccuracy(100);
    setTotalCharacters(0);
    setCorrectCharacters(0);
    setIsCompleted(false);
  }, []);

  // 다음 텍스트로 넘어갈 때
  const moveToNextText = useCallback(() => {
    const newCompletedCount = completedCount + 1;
    
    // 단어 완성 시 현재 단어 길이도 CPM에 포함
    const currentCpm = calculateCPM();
    const finalCpm = mode === 'words' ? currentCpm : cpm;
    
    // 단어 모드에서 완성된 단어의 정확도 추가
    if (mode === 'words' && currentText) {
      // 현재 단어가 정확히 맞는지 확인
      const isWordCorrect = userInput === currentText;
      const wordLength = language === 'kr' ? countKoreanCharacters(currentText) : currentText.length;
      
      // 전체 세션에 현재 단어의 정확도 추가
      setTotalCharacters(prev => prev + wordLength);
      if (isWordCorrect) {
        setCorrectCharacters(prev => prev + wordLength);
      }
    }
    
    // 단어 모드에서 목표 달성 체크
    if (mode === 'words' && newCompletedCount >= wordTarget) {
      setPreviousCpm(finalCpm);
      setPreviousAccuracy(accuracy);
      setCpm(finalCpm); // 최종 CPM 고정
      setIsCompleted(true);
      return;
    }
    
    if (mode === 'words') {
      // 단어 모드: 연속적으로 진행, CPM과 정확도 유지
      if (nextText) {
        setCurrentText(nextText);
        setNextRandomText();
      }
      setUserInput('');
      setCompletedCount(newCompletedCount);
      // startTime 유지하여 연속적인 CPM 계산
      // 정확도는 새로운 단어로 리셋
    } else {
      // 문장 모드: 완전히 새로 시작
      setPreviousCpm(finalCpm);
      setPreviousAccuracy(accuracy);
      const newCurrentText = getRandomText(true);
      setCurrentText(newCurrentText);
      setUserInput('');
      setCompletedCount(newCompletedCount);
      // 문장 모드는 새로 시작
      setStartTime(null);
      setCpm(0);
    }
  }, [mode, wordTarget, nextText, getRandomText, setNextRandomText, cpm, accuracy, completedCount, calculateCPM, currentText, userInput, language, countKoreanCharacters]);

  // 모드 변경 시
  const handleModeChange = useCallback((newMode) => {
    if (newMode === mode) return; // 같은 모드 클릭 시 무시
    setMode(newMode);
    setCurrentText('');
    setNextText('');
    resetPractice();
  }, [resetPractice, mode]);

  // 입력 처리
  const handleInputChange = useCallback((e) => {
    const input = e.target.value;
    
    // 현재 텍스트 길이를 초과하지 않도록 제한
    if (currentText && input.length <= currentText.length) {
      // startTime이 없고 입력이 시작되면 시작 시간 설정
      if (!startTime && input.length > 0) {
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

    if (typingMode === 'overlay') {
      // 겹쳐쓰기 모드: 하나의 통합된 텍스트로 표시
      const maxLength = Math.max(currentText.length, userInput.length);
      const result = [];
      
      for (let index = 0; index < maxLength; index++) {
        const originalChar = currentText[index];
        const typedChar = userInput[index];
        
        let displayChar = '';
        let className = 'transition-all duration-200';
        let showCursor = false;
        
        if (index < userInput.length) {
          // 타이핑된 부분
          displayChar = typedChar === ' ' ? '\u00A0' : typedChar;
          
          if (originalChar && typedChar === originalChar) {
            // 올바른 글자
            className += ' text-blue-500';
          } else {
            // 틀린 글자 또는 초과 타이핑
            if (language === 'kr' && index === userInput.length - 1 && originalChar) {
              className += ' text-gray-600'; // 한글 작성 중
            } else {
              className += ' text-red-500 bg-red-100 rounded px-1';
            }
          }
        } else if (index < currentText.length) {
          // 아직 타이핑하지 않은 부분
          displayChar = originalChar === ' ' ? '\u00A0' : originalChar;
          className += ' text-gray-600';
          
          // 현재 타이핑 위치에 커서 표시
          if (index === userInput.length) {
            showCursor = true;
          }
        }
        
        if (displayChar) {
          result.push(
            <span key={index} className={`relative ${className}`} style={{ whiteSpace: 'pre' }}>
              {displayChar}
              {showCursor && (
                <span className="absolute top-1/2 left-0 transform -translate-y-1/2 w-0.5 h-8 bg-blue-500 animate-pulse"></span>
              )}
            </span>
          );
        }
      }
      
      // 텍스트 끝에서도 위아래 중앙 정렬된 커서 표시
      if (userInput.length >= currentText.length) {
        result.push(
          <span key="end-cursor" className="relative inline-block h-8">
            <span className="absolute top-1/2 left-0 transform -translate-y-1/2 w-0.5 h-8 bg-blue-500 animate-pulse"></span>
          </span>
        );
      }
      
      return result;
    } else {
      // 기본 모드: 기존 방식
      return currentText.split('').map((char, index) => {
        let className = 'text-gray-800 transition-all duration-200';
        let underline = false;

        if (index < userInput.length) {
          if (char === userInput[index]) {
            className = 'text-blue-500 transition-all duration-200';
          } else {
            // 한글 작성 중일 때는 빨간색으로 표시하지 않음
            if (language === 'kr' && index === userInput.length - 1) {
              className = 'text-gray-800';
            } else {
              className = 'text-red-500 transition-all duration-200';
            }
          }
        }

        // 현재 단어에 밑줄 표시 (단어 모드에서만)
        if (mode === 'words' && index >= wordStart && index < wordEnd && index >= userInput.length) {
          underline = true;
        }

        // 띄어쓰기 처리를 위해 &nbsp; 사용
        const displayChar = char === ' ' ? '\u00A0' : char;

        return (
          <span key={index} className={`relative ${className}`} style={{ whiteSpace: 'pre' }}>
            {displayChar}
            {underline && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 transition-all duration-200"></span>
            )}
          </span>
        );
      });
    }
  }, [currentText, userInput, language, mode, typingMode, findCurrentWordBoundaries]);

  // 다음 단어 표시 (단어 모드에서만)
  const renderNextWord = useCallback(() => {
    if (mode !== 'words' || !nextText) return null;
    
    return (
      <span className="text-gray-400 text-xl ml-4 opacity-50">
        {nextText}
      </span>
    );
  }, [mode, nextText]);

  // 텍스트 완성 체크 (정확히 맞거나 글자수가 같으면 완성 가능)
  const checkCompletion = useCallback(() => {
    if (currentText && (userInput === currentText || userInput.length === currentText.length)) {
      // 완성 시점에 현재 단어/문장의 글자수도 포함하여 CPM 계산
      const currentWordLength = language === 'kr' ? countKoreanCharacters(currentText) : currentText.length;
      
      // 단어 모드에서는 완성된 단어의 글자수도 즉시 반영
      if (mode === 'words' && startTime) {
        const now = Date.now();
        const timeElapsed = (now - startTime) / 60000;
        let totalChars = completedCount * 5 + currentWordLength; // 완성된 단어 포함
        const newCpm = timeElapsed > 0 ? Math.round(totalChars / timeElapsed) : 0;
        setCpm(newCpm);
      }
      
      moveToNextText();
      return true;
    }
    return false;
  }, [userInput, currentText, moveToNextText, language, countKoreanCharacters, mode, startTime, completedCount]);

  // 키보드 이벤트
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // 엔터 키도 하나의 문자로 카운팅 (스무스한 CPM을 위해)
      if (mode === 'words' && startTime) {
        const now = Date.now();
        const timeElapsed = (now - startTime) / 60000;
        let totalChars = completedCount * 5; // 완료된 단어들
        if (currentText && (userInput === currentText || userInput.length === currentText.length)) {
          // 현재 단어 완성 + 엔터키(1자)
          totalChars += (language === 'kr' ? countKoreanCharacters(currentText) : currentText.length) + 1;
        } else {
          // 미완성 단어 + 엔터키(1자)
          totalChars += (language === 'kr' ? countKoreanCharacters(userInput) : userInput.length) + 1;
        }
        const newCpm = timeElapsed > 0 ? Math.round(totalChars / timeElapsed) : 0;
        setCpm(newCpm);
      }
      checkCompletion();
    } else if (e.key === ' ') {
      if (mode === 'words') {
        e.preventDefault();
        // 스페이스바도 하나의 문자로 카운팅
        if (startTime) {
          const now = Date.now();
          const timeElapsed = (now - startTime) / 60000;
          let totalChars = completedCount * 5; // 완료된 단어들
          if (currentText && (userInput === currentText || userInput.length === currentText.length)) {
            // 현재 단어 완성 + 스페이스바(1자)
            totalChars += (language === 'kr' ? countKoreanCharacters(currentText) : currentText.length) + 1;
          } else {
            // 미완성 단어 + 스페이스바(1자)
            totalChars += (language === 'kr' ? countKoreanCharacters(userInput) : userInput.length) + 1;
          }
          const newCpm = timeElapsed > 0 ? Math.round(totalChars / timeElapsed) : 0;
          setCpm(newCpm);
        }
        checkCompletion();
      } else if (mode === 'sentences' && (userInput === currentText || userInput.length === currentText.length)) {
        // 문장 모드에서 완성된 경우에만 스페이스바로 다음 문장
        e.preventDefault();
        checkCompletion();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setUserInput('');
    }
  }, [checkCompletion, mode, userInput, currentText, startTime, completedCount, language, countKoreanCharacters]);

  // 화면 클릭 시 input으로 포커스 이동
  const handleContainerClick = useCallback((e) => {
    // 버튼이나 다른 인터랙티브 요소를 클릭한 경우는 제외
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') {
      return;
    }
    
    // input 요소 찾아서 포커스 (겹치기 모드에서는 숨겨진 input 포커스)
    const inputElement = typingMode === 'overlay' 
      ? document.querySelector('input.opacity-0')
      : document.querySelector('input[type="text"]');
    if (inputElement) {
      inputElement.focus();
    }
  }, [typingMode]);

  // 뒤로 가기
  const handleGoBack = useCallback(() => {
    navigate('/');
  }, [navigate]);

  // 새로운 시작 함수 제거

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
    <div 
      className="flex flex-col items-center justify-center min-h-screen bg-blue-100 p-4"
      onClick={handleContainerClick}
    >
      <div className="w-full max-w-4xl">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">
            타이핑 연습 - {language === 'en' ? 'English' : '한국어'}
          </h1>
          <div className="flex space-x-4 text-lg font-semibold">
            <span className="text-blue-600">현재: {cpm} CPM</span>
            <span className="text-green-600">정확도: {accuracy}%</span>
            {previousCpm > 0 && (
              <span className="text-purple-600">이전: {previousCpm} CPM</span>
            )}
            {previousAccuracy < 100 && (
              <span className="text-orange-600">이전 정확도: {previousAccuracy}%</span>
            )}
          </div>
        </div>
        
        {/* 모드 토글 버튼 */}
        <div className="mb-6 flex justify-center space-x-4">
          <button
            onClick={() => setTypingMode(typingMode === 'basic' ? 'overlay' : 'basic')}
            className={`px-8 py-3 rounded-lg transition-all duration-500 ease-in-out transform hover:scale-105 active:scale-95 ${
              typingMode === 'overlay' 
                ? 'bg-purple-500 text-white hover:bg-purple-600 shadow-lg' 
                : 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg'
            }`}
          >
            <span className="transition-all duration-300">
              {typingMode === 'basic' ? '🎯 기본 모드' : '👻 겹쳐쓰기 모드'}
            </span>
          </button>
          
          <div className="flex space-x-2">
            <button
              onClick={() => handleModeChange('words')}
              className={`px-6 py-3 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95 ${
                mode === 'words' 
                  ? 'bg-green-500 text-white hover:bg-green-600 shadow-md' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              단어
            </button>
            <button
              onClick={() => handleModeChange('sentences')}
              className={`px-6 py-3 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95 ${
                mode === 'sentences' 
                  ? 'bg-green-500 text-white hover:bg-green-600 shadow-md' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              문장
            </button>
          </div>
          
          {/* 단어 모드일 때 목표 개수 선택 */}
          {mode === 'words' && (
            <div className="flex space-x-2">
              {[30, 50, 100].map(target => (
                <button
                  key={target}
                  onClick={() => {
                    setWordTarget(target);
                    resetPractice();
                  }}
                  className={`px-4 py-3 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95 ${
                    wordTarget === target 
                      ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-md' 
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  {target}개
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mb-6 text-2xl leading-relaxed bg-white p-6 rounded-lg shadow flex items-center whitespace-pre-wrap transition-all duration-300">
          {renderCurrentText()}
          {renderNextWord()}
        </div>

        {/* 겹치기 모드가 아닐 때만 input 창 표시 */}
        {typingMode !== 'overlay' && (
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
        )}

        {/* 겹치기 모드일 때는 숨겨진 input으로 키보드 이벤트만 처리 */}
        {typingMode === 'overlay' && (
          <input
            type="text"
            value={userInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="opacity-0 absolute -z-10 pointer-events-none"
            autoFocus
          />
        )}

        <div className="flex justify-between items-center text-lg text-gray-600">
          <span>
            {mode === 'words' 
              ? `진행률: ${completedCount}/${wordTarget}개` 
              : `완료한 개수: ${completedCount}개`
            }
          </span>
          <div className="flex space-x-4">
            <span className="text-sm text-gray-500">
              {typingMode === 'basic' ? '기본 모드' : '겹쳐쓰기 모드'}
            </span>
            <span className="text-sm text-blue-500">
              {mode === 'words' 
                ? `전체 ${totalCharacters}자 입력 (정확: ${correctCharacters}자)` 
                : `현재 ${userInput.length}/${currentText.length}자`
              }
            </span>
          </div>
        </div>
      </div>

      {/* 완료 화면 */}
      {isCompleted && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md w-full mx-4">
            <h2 className="text-3xl font-bold mb-6 text-blue-600">
              🎉 목표 달성! 🎉
            </h2>
            <div className="mb-6 space-y-4">
              <div className="text-lg">
                <span className="font-semibold">{wordTarget}개 단어 완료!</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xl">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-blue-600 font-bold text-2xl">{cpm}</div>
                  <div className="text-blue-800 text-sm">CPM</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-green-600 font-bold text-2xl">{accuracy}%</div>
                  <div className="text-green-800 text-sm">정확도</div>
                </div>
              </div>
            </div>
            <div className="flex justify-center space-x-4">
              <button
                onClick={resetPractice}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg shadow text-lg font-semibold transition duration-300 ease-in-out hover:bg-blue-600 hover:scale-105 active:scale-95"
              >
                다시 시작
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-gray-100 text-blue-500 rounded-lg shadow text-lg font-semibold transition duration-300 ease-in-out hover:bg-gray-200 hover:scale-105 active:scale-95"
              >
                홈으로
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 뒤로 가기 버튼 */}
      {!isCompleted && (
        <button
          onClick={handleGoBack}
          className="mt-8 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-300 ease-in-out transform hover:scale-105 active:scale-95"
        >
          홈으로 돌아가기
        </button>
      )}
    </div>
  );
};

export default TypingSession;