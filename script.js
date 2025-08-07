
document.addEventListener('DOMContentLoaded', function() {
    const dateInput = document.getElementById('mealDate');
    const searchBtn = document.getElementById('searchBtn');
    const mealInfo = document.getElementById('mealInfo');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    
    // 오늘 날짜를 기본값으로 설정
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    dateInput.value = todayString;
    
    // 검색 버튼 클릭 이벤트
    searchBtn.addEventListener('click', function() {
        const selectedDate = dateInput.value;
        if (selectedDate) {
            searchMealInfo(selectedDate);
        } else {
            alert('날짜를 선택해주세요.');
        }
    });
    
    // Enter 키 이벤트
    dateInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchBtn.click();
        }
    });
    
    async function searchMealInfo(date) {
        showLoading();
        
        try {
            // 날짜 형식을 YYYYMMDD로 변환
            const formattedDate = date.replace(/-/g, '');
            
            // NEIS API URL 구성
            const apiUrl = `https://open.neis.go.kr/hub/mealServiceDietInfo?ATPT_OFCDC_SC_CODE=J10&SD_SCHUL_CODE=7530079&MLSV_YMD=${formattedDate}`;
            
            // CORS 문제 해결을 위해 프록시 서비스 사용
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(apiUrl)}`;
            
            const response = await fetch(proxyUrl);
            
            if (!response.ok) {
                throw new Error('네트워크 오류가 발생했습니다.');
            }
            
            const data = await response.json();
            const xmlData = data.contents;
            
            // XML 파싱
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlData, 'text/xml');
            
            // 급식 정보 추출
            const mealInfo = extractMealInfo(xmlDoc, date);
            displayMealInfo(mealInfo, date);
            
        } catch (err) {
            console.error('Error fetching meal info:', err);
            showError();
        }
    }
    
    function extractMealInfo(xmlDoc, date) {
        const rows = xmlDoc.getElementsByTagName('row');
        
        if (rows.length === 0) {
            return null;
        }
        
        const mealData = [];
        
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            
            // 급식 유형과 메뉴 정보 추출
            const mealType = getElementText(row, 'MMEAL_SC_NM');
            const dishName = getElementText(row, 'DDISH_NM');
            const originInfo = getElementText(row, 'ORPLC_INFO');
            const calInfo = getElementText(row, 'CAL_INFO');
            const nutritionInfo = getElementText(row, 'NTR_INFO');
            
            if (dishName) {
                mealData.push({
                    type: mealType,
                    menu: dishName,
                    origin: originInfo,
                    calories: calInfo,
                    nutrition: nutritionInfo
                });
            }
        }
        
        return mealData;
    }
    
    function getElementText(parent, tagName) {
        const element = parent.getElementsByTagName(tagName)[0];
        return element ? element.textContent.trim() : '';
    }
    
    function displayMealInfo(mealData, date) {
        hideLoading();
        
        if (!mealData || mealData.length === 0) {
            mealInfo.innerHTML = `
                <div class="meal-date">${formatDate(date)}</div>
                <div class="meal-content">
                    <p style="text-align: center; color: #6c757d; margin-top: 40px;">
                        해당 날짜에 급식 정보가 없습니다.<br>
                        (주말, 공휴일, 방학 등)
                    </p>
                </div>
            `;
            return;
        }
        
        let content = `<div class="meal-date">${formatDate(date)}</div>`;
        
        mealData.forEach(meal => {
            content += `<div class="meal-content">`;
            
            if (meal.type) {
                content += `<h3 style="color: #495057; margin-bottom: 15px;">${meal.type}</h3>`;
            }
            
            if (meal.menu) {
                const menuItems = meal.menu.split('<br/>').filter(item => item.trim());
                menuItems.forEach(item => {
                    // 알레르기 정보 제거 (괄호 안의 숫자들)
                    const cleanItem = item.replace(/\([0-9,.]+\)/g, '').trim();
                    if (cleanItem) {
                        content += `<span class="meal-item">• ${cleanItem}</span>`;
                    }
                });
            }
            
            if (meal.calories) {
                content += `<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #dee2e6; color: #6c757d;">
                    <strong>칼로리:</strong> ${meal.calories}
                </div>`;
            }
            
            content += `</div>`;
        });
        
        mealInfo.innerHTML = content;
    }
    
    function formatDate(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            weekday: 'long'
        };
        return date.toLocaleDateString('ko-KR', options);
    }
    
    function showLoading() {
        loading.classList.remove('hidden');
        mealInfo.classList.add('hidden');
        error.classList.add('hidden');
    }
    
    function hideLoading() {
        loading.classList.add('hidden');
        mealInfo.classList.remove('hidden');
        error.classList.add('hidden');
    }
    
    function showError() {
        loading.classList.add('hidden');
        mealInfo.classList.add('hidden');
        error.classList.remove('hidden');
    }
});
