const categories = {
    "Electric(순수 전기)": ["C40 Recharge", "XC40 Recharge", "EX30"],
    "Mild hybrids (마일드 하이브리드)": ["XC40", "XC60", "XC90", "S60", "S90", "V60CC", "V90CC"],
    "Plug-in hybrids (플러그인 하이브리드)": ["XC60 Recharge", "XC90 Recharge", "S90 Recharge"],
    "Other (기타)": ["EM", "RSA", "Marketing", "Hej Volvo", "Volvo Cars", "TMAP Auto", "NUGU Auto", "FLO", "All"]
};

let documents = [];
let filteredDocuments = [];
let currentPage = 1;
const itemsPerPage = 10;
let selectedCategory = '전체목록';

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    loadExcelData();
    document.getElementById('search-bar').addEventListener('keypress', handleKeyPress);
    document.querySelector('.modal .close').addEventListener('click', closeModal);
    document.getElementById('prev-page').addEventListener('click', prevPage);
    document.getElementById('next-page').addEventListener('click', nextPage);
    showAllDocuments(); // 페이지가 로드될 때 전체 목록을 기본으로 표시
});

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        searchDocuments();
    }
}

function searchDocuments() {
    const searchTerm = document.getElementById('search-bar').value.toLowerCase();
    const searchCategory = document.getElementById('search-category').value;
    filteredDocuments = documents.filter(doc => {
        const matchesCategory = searchCategory ? doc.Category === searchCategory : true;
        const matchesTerm = doc.Title.toLowerCase().includes(searchTerm) || stripHTML(doc.Data).toLowerCase().includes(searchTerm);
        return matchesCategory && matchesTerm;
    });
    currentPage = 1; // 검색 시 페이지를 처음으로 초기화
    displayDocuments();
}

function stripHTML(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || "";
}

function displayDocuments() {
    const documentList = document.getElementById('document-list');
    documentList.innerHTML = '';

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const documentsToShow = filteredDocuments.slice(startIndex, endIndex);

    documentsToShow.forEach(doc => {
        const documentItem = document.createElement('div');
        documentItem.className = 'document-item';
        const imageHTML = doc.Image ? `<img src="images/${doc.Image}" alt="${doc.Title}" style="max-width:100px; margin-top:10px;">` : '';
        const escapedTitle = JSON.stringify(doc.Title).slice(1, -1); // JSON.stringify로 이스케이프 처리
        const escapedData = JSON.stringify(doc.Data).slice(1, -1); // JSON.stringify로 이스케이프 처리
        documentItem.innerHTML = `
            <div class="document-title" onclick="openDocument(\`${doc.howto || ''}\`, '${escapedTitle}', '${doc.Date}', \`${escapedData}\`, '${doc.Image || ''}', '${doc.Category}')">${doc.Title}</div>
            <div class="document-content">${stripHTML(doc.Data.split('\n')[0])}</div>
            <div class="document-date">${doc.Date}</div>
            ${imageHTML}
        `;
        documentList.appendChild(documentItem);
    });

    updatePagination();
}

function filterDocuments(category, group, element) {
    document.querySelectorAll('.category-item').forEach(item => {
        item.classList.remove('active');
    });
    element.classList.add('active');
    selectedCategory = `${group} > ${category}`;
    document.getElementById('selected-category').textContent = `선택된 카테고리: ${selectedCategory}`;
    filteredDocuments = documents.filter(doc => doc.Category === category);
    currentPage = 1; // 필터 시 페이지를 처음으로 초기화
    displayDocuments();
}

function showAllDocuments(element) {
    document.querySelectorAll('.category-item').forEach(item => {
        item.classList.remove('active');
    });
    if (element) {
        element.classList.add('active');
    }
    selectedCategory = '전체목록';
    document.getElementById('selected-category').textContent = `선택된 카테고리: ${selectedCategory}`;
    filteredDocuments = documents;
    currentPage = 1; // 전체 보기 시 페이지를 처음으로 초기화
    displayDocuments();
}

function openDocument(howto, title, date, content, image, category) {
    const modal = document.getElementById('document-modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-category').textContent = `${category} | ${date}`; // 카테고리 옆에 날짜 추가
    document.getElementById('modal-howto').textContent = howto !== 'undefined' ? howto : ''; // howto 추가
    const imageHTML = image ? `<img src="images/${image}" alt="${title}" style="max-width:100%;">` : '';
    const contentHTML = content ? `${content}` : ''; // 구분선 추가
    document.getElementById('modal-content').innerHTML = imageHTML + contentHTML; // HTML 코드로 삽입
    modal.style.display = 'block';
}

function closeModal() {
    const modal = document.getElementById('document-modal');
    modal.style.display = 'none';
}

// 모달 내용 클릭시 닫히지 않도록 수정
document.querySelector('.modal-content').addEventListener('click', function(event) {
    event.stopPropagation();
});

window.onclick = function(event) {
    const modal = document.getElementById('document-modal');
    if (event.target === modal) {
        closeModal();
    }
}

function loadExcelData() {
    fetch('https://raw.githubusercontent.com/hyunos/hyuno.s/main/kbase.xlsx')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.arrayBuffer();
        })
        .then(data => {
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            documents = XLSX.utils.sheet_to_json(sheet, { raw: false, dateNF: 'yyyy-mm-dd' });
            documents.forEach(doc => {
                if (doc.Date) {
                    doc.Date = XLSX.SSF.format('yyyy-mm-dd', new Date(doc.Date));
                }
                if (doc.Title) {
                    doc.Title = doc.Title.replace(/"/g, '&quot;');
                }
                if (doc.Data) {
                    doc.Data = doc.Data.replace(/"/g, '&quot;');
                }
            });
            filteredDocuments = documents;
            displayDocuments(documents);
        })
        .catch(error => {
            console.error('Error loading Excel data:', error);
        });
}

function loadCategories() {
    const categoryList = document.getElementById('category-list');
    categoryList.innerHTML = ''; // Clear existing categories

    // "카테고리" 제목 추가
    const categoryTitle = document.createElement('div');
    categoryTitle.textContent = '카테고리';
    categoryTitle.style.color = '#1B365D';
    categoryTitle.style.fontWeight = 'bold';
    categoryTitle.style.marginBottom = '10px';
    categoryTitle.style.marginLeft = '10px';
    categoryList.appendChild(categoryTitle);

    // "모두 보기" 버튼 추가
    const allButton = document.createElement('div');
    allButton.className = 'category-item';
    allButton.textContent = "전체목록";
    allButton.style.marginTop = '10px'; // 상단 공간 추가
    allButton.style.marginBottom = '10px'; // 하단 공간 추가
    allButton.onclick = () => showAllDocuments(allButton);
    categoryList.appendChild(allButton);

    for (const [group, models] of Object.entries(categories)) {
        const groupElement = document.createElement('div');
        groupElement.className = 'category-group';
        const groupTitle = document.createElement('div');
        groupTitle.className = 'category-group-title';
        groupTitle.textContent = group;
        groupElement.appendChild(groupTitle);
        models.forEach(model => {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item';
            categoryItem.textContent = model;
            categoryItem.onclick = () => filterDocuments(model, group, categoryItem);
            groupElement.appendChild(categoryItem);
        });
        categoryList.appendChild(groupElement);
    }

    // 카테고리 검색 드롭다운 메뉴 설정
    const categoryDropdown = document.getElementById('search-category');
    categoryDropdown.innerHTML = '<option value="">모든 카테고리</option>';
    for (const group of Object.keys(categories)) {
        const groupOption = document.createElement('optgroup');
        groupOption.label = group;
        categories[group].forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            groupOption.appendChild(option);
        });
        categoryDropdown.appendChild(groupOption);
    }
}

function updatePagination() {
    const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
    const pageNumbers = document.getElementById('page-numbers');
    pageNumbers.innerHTML = `${currentPage} of ${totalPages}`;
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage === totalPages;
}

function nextPage() {
    const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayDocuments();
    }
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        displayDocuments();
    }
}
    
function copyEmail(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    alert('이메일 주소가 클립보드에 복사되었습니다.');
}
    
var userName;

window.onload = function() {
    userName = prompt("에이전트 이름을 입력하세요. \n입력하지 않으면 순로기가 됩니다.", "");

    if (userName == null || userName == "") {
        userName = "순로기";
    }
    var greetingElement = document.getElementById('greeting');
    greetingElement.innerHTML = "Hej! " + userName.slice(-2);
};

//기본 템플릿
function logging1() {
    var customerName = "고객명: ";
    var ctn = "연락처: ";
    var vin = "차량번호: ";
    var carModel = "모델명: ";
    var question = "문의 사항: ";
    var troubleshooting = "해결 방법(단계): ";
    var emailText = customerName + "\n" + ctn + "\n" + vin + "\n" + carModel + "\n" + "\n" + question + "\n" + "\n" + troubleshooting + "\n";
    navigator.clipboard.writeText(emailText)
        .then(function() {
            console.log('Default Template Copied');
            alert('기본 템플릿이 복사되었습니다.');
        })
        .catch(function(error) {
            console.error('클립보드 복사 실패: ', error);
            alert('클립보드 복사 실패: ' + error);
        });
}

function logging2() {
    var notice = "* 소방에 연락하는 경우 즉시 고객의 위치(시)의 소방안전센터로 연결 요청하십시오.";
    var location = "- 차량 위치: ";
    var custstatus = "- 고객 현재 상태: ";
    var cust1 = "  • 의식이 있습니까: Y/N";
    var cust2 = "  • 말을 명확히 할 수 있습니까?: Y/N";
    var cust3 = "  • 움직일 수 있는 상태입니까?: Y/N";
    var cust4 = "  • 동승자가 있습니까? 있다면 몇 명입니까?: Y/N (00명)";
    var vinmodel = "- 차량 모델: ";
    var vinumber = "- 차량 번호: ";
    var cabllback = "- 고객 이름/성별/휴대폰 번호: ";
    var rescue = "- 소방이 도착할 때까지 고객이 통화를 지속하길 원합니까?: Y/N";
    var callback = "- 15분 뒤에 연락을 희망합니까? 희망한다면 연락처를 기록합니다.: Y/N";
    var callbacknum = "  • 연락처: ";
    var important = "* 고객이 의식이 있는 경우 콜백 동의를 얻은 후 15분 후에 다시 연락하여 소방이 고객에게 도착했는지 확인합니다.";
    var emailText = notice + "\n" + "\n" + location + "\n" + custstatus + "\n" + cust1 + "\n" + cust2 + "\n" + cust3 + "\n" + cust4 + "\n" + vinmodel + "\n" + vinumber + "\n" + cabllback + "\n" + rescue + "\n" + callback + "\n" + callbacknum + "\n" + "\n" + important;
    navigator.clipboard.writeText(emailText)
        .then(function() {
            console.log('E Call Template Copied');
            alert('템플릿이 복사되었습니다. \nE Call를 지원하는 경우 선조치 후보고를 반드시 이행해야 합니다.');
        })
        .catch(function(error) {
            console.error('클립보드 복사 실패: ', error);
            alert('클립보드 복사 실패: ' + error);
        });
}

function logging3() {
    var important = "* 타이어 손상(휠을 제외한)의 경우 출동 이후 견인 필요 시 본인 과실에 해당하여 비용이 발생합니다.";
    var customerName = "고객명: ";
    var ctn = "연락처: ";
    var carNumber = "차량번호: ";
    var carVin = "차대번호: ";
    var accident = "사고 여부: Y/N";
    var towingrequest = "견인 요청: Y/N";
    var location = "현재 위치: ";
    var towingsvc = "견인 요청 서비스센터: ";
    var billing = "비용 발생 가능성 안내 : Y/N: ";
    var emailText = important + "\n" + "\n" + customerName + "\n" + ctn + "\n" + carNumber + "\n" + accident + "\n" + towingrequest + "\n" + location + "\n" + towingsvc + "\n" + billing;
    navigator.clipboard.writeText(emailText)
        .then(function() {
            console.log('E Call Template copied.');
            alert('BCall 양식이 복사되었습니다.');
        })
        .catch(function(error) {
            console.error('클립보드 복사 실패: ', error);
            alert('클립보드 복사 실패: ' + error);
        });
}

function logging4() {
    var customerName = "※ 영등포 / 마포 인근 지역 엔지니어 출동건은 모두 문래에서 출동 → 문래로 입고 프로세스 \n- 고객명: \n- 연락처: \n- 차량 번호: \n- 사고 여부:Y/N \n- 현재 위치: \n- 고객 요청 서비스센터(Y인 경우 센터명): Y/N \n- 기존 방문 서비스센터(DMS 기준 없으면 N): \n- 최종 입고 안내 서비스센터:";
    navigator.clipboard.writeText(customerName)
        .then(function() {
            console.log('RSA Template Copied');
            alert('RSA 소켓 발행 템플릿이 복사되었습니다.');
        })
        .catch(function(error) {
            console.error('클립보드 복사 실패: ', error);
            alert('클립보드 복사 실패: ' + error);
        });
}

function svccsat() {
    var customerName = "고객명: ";
    var ctn = "연락처: +82";
    var svclocation = "차량번호: ";
	var date = "서비스센터: ";
	var engineername = "만족한 점: ";
    var emailText = customerName + "\n" + ctn + "\n" + svclocation + "\n" + date + "\n" + engineername + "\n";
    navigator.clipboard.writeText(emailText)
        .then(function() {
            console.log('SVC CSAT Copied');
            alert('서비스센터 칭찬 템플릿이 복사되었습니다. \n팀장님께 Teams로 보고하십시오.');
        })
        .catch(function(error) {
            console.error('클립보드 복사 실패: ', error);
            alert('클립보드 복사 실패: ' + error);
        });
}

function svcdsat() {
    var customerName = "고객명: ";
    var ctn = "연락처: ";
    var svclocation = "방문 서비스센터: ";
	var date = "방문 일자: ";
	var engineername = "엔지니어 이름: ";
	var why = "불만 사항: ";
    var emailText = customerName + "\n" + ctn + "\n" + svclocation + "\n" + date + "\n" + engineername + "\n" + why;
    navigator.clipboard.writeText(emailText)
        .then(function() {
            console.log('SVC CSAT Copied');
            alert('서비스센터 불만 템플릿이 복사되었습니다. \n팀장님께 Teams로 보고하십시오.');
        })
        .catch(function(error) {
            console.error('클립보드 복사 실패: ', error);
            alert('클립보드 복사 실패: ' + error);
        });
}


function giftshow() {
    var customerName = "고객명: ";
    var ctn = "연락처: ";
    var carNumber = "차량번호: ";
    var saleslo = "시승 전시장: ";
    var contactnum = "연락 가능 번호: ";
    var time = "연락 가능 시간: ";
    var emailText = customerName + "\n" + ctn + "\n" + carNumber + "\n" + saleslo + "\n" + contactnum + "\n" + time;
    navigator.clipboard.writeText(emailText)
        .then(function() {
            console.log('SVC CSAT Copied');
            alert('기프티쇼 미수신 템플릿이 복사되었습니다.');
        })
        .catch(function(error) {
            console.error('클립보드 복사 실패: ', error);
            alert('클립보드 복사 실패: ' + error);
        });
}

function centerlocation() {
    var sms1 = "[Volvo 고객지원]";
    var sms2 = "안녕하세요, 고객님. \n요청하신 Volvo 서비스센터 위치 및 연락처입니다.";
    var sms3 = "(서비스센터 위치 및 번호 작성 란)";
    var sms4 = "오늘도 Volvo와 함께 편안하고 안전한 드라이빙 되시기를 바랍니다.";
    var sms5 = "Volvo 자동차 고객 지원팀 " + userName + " 드림";
    var emailText = sms1 + "\n" + sms2 + "\n" + sms3 + "\n" + "\n" + sms4 + "\n" + sms5;
    navigator.clipboard.writeText(emailText)
        .then(function() {
            console.log('SVC Template Copied');
            alert('서비스센터 위치 SMS 템플릿이 복사되었습니다.');
        })
        .catch(function(error) {
            console.error('클립보드 복사 실패: ', error);
            alert('클립보드 복사 실패: ' + error);
        });
}

function logging6() {
	var sms1 = "[Volvo 고객지원]";
    var sms2 = "안녕하세요, 고객님. \n요청하신 Volvo 트럭 고객지원센터 연락처입니다. \n\n☎ 080-038-1000";
    var sms4 = "오늘도 편안하고 안전한 드라이빙 되시기 바랍니다.";
    var sms5 = "Volvo 자동차 고객 지원팀 " + userName + " 드림";
    var emailText = sms1 + "\n" + sms2 + "\n" + "\n" + sms4 + "\n" + sms5;
    // Clipboard API를 사용하여 텍스트를 복사합니다.
    navigator.clipboard.writeText(emailText)
        .then(function() {
		console.log('Truck Template Copied');
            alert('볼보 트럭 SMS 템플릿이 복사되었습니다.');
	})
        .catch(function(error) {
		console.error('클립보드 복사 실패: ',
		error);
            alert('클립보드 복사 실패: ' + error);
	});}
        
function logging7() {
	var sms1 = "[Volvo 고객지원]";
    var sms2 = "안녕하세요, 고객님. \n요청하신 Volvo 건설기계 고객지원센터 연락처입니다. \n\n☎ 1644-1172";
    var sms4 = "오늘도 편안하고 안전한 드라이빙 되시기 바랍니다.";
    var sms5 = "Volvo 자동차 고객 지원팀 " + userName + " 드림";
    var emailText = sms1 + "\n" + sms2 + "\n" + "\n" + sms4 + "\n" + sms5;
    // Clipboard API를 사용하여 텍스트를 복사합니다.
    navigator.clipboard.writeText(emailText)
        .then(function() {
		console.log('CE Template Copied');
            alert('볼보 건설기계 SMS 템플릿이 복사되었습니다.');
	})
        .catch(function(error) {
		console.error('클립보드 복사 실패: ',
		error);
            alert('클립보드 복사 실패: ' + error);
	});}
        
function logging8() {
	var sms1 = "[Volvo 고객지원]";
    var sms2 = "안녕하세요, 고객님. \n요청하신 Flo 고객센터 연락처입니다. \n\n☎ 1599-6034 \n홈페이지: https://www.music-flo.com";
    var sms4 = "오늘도 Volvo와 함께 편안하고 안전한 드라이빙 되시기를 바랍니다.";
    var sms5 = "Volvo 자동차 고객 지원팀 " + userName + " 드림";
    var emailText = sms1 + "\n" + sms2 + "\n" + "\n" + sms4 + "\n" + sms5;
    // Clipboard API를 사용하여 텍스트를 복사합니다.
    navigator.clipboard.writeText(emailText)
        .then(function() {
		console.log('Flo Template Copied');
            alert('Flo SMS 템플릿이 복사되었습니다.');
	})
        .catch(function(error) {
		console.error('클립보드 복사 실패: ',
		error);
            alert('클립보드 복사 실패: ' + error);
	});}

function logging9() {
	var sms1 = "[Volvo 고객지원]";
    var sms2 = "안녕하세요, 고객님. \n요청하신 TMAP 고객 문의 채널입니다. \n\n휴대폰에서 TMAP 실행 > 고객센터 > 1:1문의를 통해 가능합니다.";
    var sms4 = "오늘도 Volvo와 함께 편안하고 안전한 드라이빙 되시기를 바랍니다.";
    var sms5 = "Volvo 자동차 고객 지원팀 " + userName + " 드림";
    var emailText = sms1 + "\n" + sms2 + "\n" + "\n" + sms4 + "\n" + sms5;
    // Clipboard API를 사용하여 텍스트를 복사합니다.
    navigator.clipboard.writeText(emailText)
        .then(function() {
		console.log('TMAP Template Copied');
            alert('TMAP SMS 템플릿이 복사되었습니다.');
	})
        .catch(function(error) {
		console.error('클립보드 복사 실패: ',
		error);
            alert('클립보드 복사 실패: ' + error);
	});}

function logging10() {
	var sms1 = "[Volvo 고객지원]";
    var sms2 = "안녕하세요, 고객님. \n요청하신 한국도로공사 긴급견인 서비스 연락처입니다. \n\n☎ 1588-2504";
    var sms4 = "고객님의 안전을 우선 생각하겠습니다.";
    var sms5 = "Volvo 자동차 고객 지원팀 " + userName + " 드림";
    var emailText = sms1 + "\n" + sms2 + "\n" + "\n" + sms4 + "\n" + sms5;
    // Clipboard API를 사용하여 텍스트를 복사합니다.
    navigator.clipboard.writeText(emailText)
        .then(function() {
		console.log('ex Template Copied');
            alert('한국도로공사 긴급견인 연락처 SMS 템플릿이 복사되었습니다.');
	})
        .catch(function(error) {
		console.error('클립보드 복사 실패: ',
		error);
            alert('클립보드 복사 실패: ' + error);
	});}

function logging11() {
	var sms1 = "[Volvo 고객지원]";
    var sms2 = "안녕하세요, 고객님. \n인포테인먼트 시스템이 동작하지 않는 경우 해결 방법입니다. \n\n디스플레이 하단의 Home 버튼(- 모양)을 길게 20초간 눌러주세요. \n*Volvo 로고가 나올 때까지 누르셔야 합니다. \n이 방법을 시도하는 경우, 바로 해결되지 않고 두 번 이상 반복해야 할 수 있습니다.";
    var sms4 = "오늘도 Volvo와 함께 편안하고 안전한 드라이빙 되시기를 바랍니다.";
    var sms5 = "Volvo 자동차 고객 지원팀 " + userName + " 드림";
    var emailText = sms1 + "\n" + sms2 + "\n" + "\n" + sms4 + "\n" + sms5;
    // Clipboard API를 사용하여 텍스트를 복사합니다.
    navigator.clipboard.writeText(emailText)
        .then(function() {
		console.log('impo reset other ex30 Copied');
            alert('중앙 화면 재시작 방법(EX30 제외)에 대한 SMS 템플릿이 복사되었습니다.');
	})
        .catch(function(error) {
		console.error('클립보드 복사 실패: ',
		error);
            alert('클립보드 복사 실패: ' + error);
	});}
        
function logging12() {
	var sms1 = "[Volvo 고객지원]";
    var sms2 = "안녕하세요, 고객님. \n인포테인먼트 시스템이 동작하지 않는 경우 해결 방법입니다. \n\n1. 주차 브레이크가 작동된 상태여야 합니다.\n2.스티어링휠(핸들)의 -과 ▽를 동시에 누릅니다. \n3. 볼보 로고가 표시될 때까지 약 15초간 눌러야 합니다.\n이 방법을 시도하는 경우, 바로 해결되지 않고 두 번 이상 반복해야 할 수 있습니다.";
    var sms4 = "오늘도 Volvo와 함께 편안하고 안전한 드라이빙 되시기를 바랍니다.";
    var sms5 = "Volvo 자동차 고객지원팀 " + userName + " 드림";
    var emailText = sms1 + "\n" + sms2 + "\n" + "\n" + sms4 + "\n" + sms5;
    // Clipboard API를 사용하여 텍스트를 복사합니다.
    navigator.clipboard.writeText(emailText)
        .then(function() {
		console.log('impo reset only ex30 Copied');
            alert('중앙 화면 재시작 방법(EX30용)에 대한 SMS 템플릿이 복사되었습니다.');
	})
        .catch(function(error) {
		console.error('클립보드 복사 실패: ',
		error);
            alert('클립보드 복사 실패: ' + error);
	});}

function logging13() {
	var sms1 = "[Volvo 고객지원]";
    var sms2 = "안녕하세요, 고객님. \nOTA 업데이트 이후 차량 시동이 걸리지 않는 경우 해결 방법입니다. \n\n1. 차량에서 하차하신 후 문을 잠급니다.\n2. 약 15분 이상 기다립니다. \n3. 이후 다시 탑승하시어 시동을 걸어봅니다. \n *이 방법으로 해결되지 않는 경우 다시 문의 부탁드립니다.";
    var sms4 = "오늘도 Volvo와 함께 편안하고 안전한 드라이빙 되시기를 바랍니다.";
    var sms5 = "Volvo 자동차 고객지원팀 " + userName + " 드림";
    var emailText = sms1 + "\n" + sms2 + "\n" + "\n" + sms4 + "\n" + sms5;
    // Clipboard API를 사용하여 텍스트를 복사합니다.
    navigator.clipboard.writeText(emailText)
        .then(function() {
		console.log('OTA engine ts Copied');
            alert('OTA 업데이트 이후 시동 걸리지 않음에 대한 SMS 템플릿이 복사되었습니다.');
	})
        .catch(function(error) {
		console.error('클립보드 복사 실패: ',
		error);
            alert('클립보드 복사 실패: ' + error);
	});}
        
function logging14() {
	var sms1 = "[Volvo 고객지원]";
    var sms2 = "안녕하세요, 고객님. \n인포테인먼트 시스템의 인터넷이 안되는 경우 해결 방법입니다. \n\n1. 성애 제거 버튼을 약 20초 동안 누릅니다. 루프에 있는 SOS 버튼이 깜박이기 시작할 때까지 누른 상태를 유지합니다.\n2. 버튼을 놓습니다. \n3. 성에 제거 기능을 끄려면 성애 제거버튼을 한 번 더 누릅니다. \n3. 약 2분 동안 기다립니다. \n그래도 동일한 경우 48시간을 기다립니다. \n48시간 뒤 다시 시도하였음에도 동일한 경우 볼보 지정 서비스센터에 문의하세요.";
    var sms4 = "오늘도 Volvo와 함께 편안하고 안전한 드라이빙 되시기를 바랍니다.";
    var sms5 = "Volvo 자동차 고객지원팀 " + userName + " 드림";
    var emailText = sms1 + "\n" + sms2 + "\n" + "\n" + sms4 + "\n" + sms5;
    // Clipboard API를 사용하여 텍스트를 복사합니다.
    navigator.clipboard.writeText(emailText)
        .then(function() {
		console.log('TCAM Reset Copied');
            alert('TCAM 재설정에 대한 SMS 템플릿이 복사되었습니다.');
	})
        .catch(function(error) {
		console.error('클립보드 복사 실패: ',
		error);
            alert('클립보드 복사 실패: ' + error);
	});}
        
function logging15() {
	var sms1 = "안녕하십니까 볼보 고객지원팀 " + userName + " 입니다.";
    var sms2 = "하기 내용으로 고객께서 문의주시어 발송 드립니다.";
    var sms4 = "" + userName + " 드림.";
    var emailText = sms1 + "\n" + "\n" + sms2 + "\n" + "\n" + "\n" + sms4
    // Clipboard API를 사용하여 텍스트를 복사합니다.
    navigator.clipboard.writeText(emailText)
        .then(function() {
		console.log('default mail Copied');
            alert('기본 메일 양식이 복사되었습니다.');
	})
        .catch(function(error) {
		console.error('클립보드 복사 실패: ',
		error);
            alert('클립보드 복사 실패: ' + error);
	});}
	
function mailtovolvo() {
	var sms1 = "[Volvo 고객지원]";
    var sms2 = "안녕하세요, 고객님. \n저희 Volvo 자동차 이용에 불편드려 죄송합니다. \n문의 주신 내용에 대해 정확히 확인하고자 하기 메일로 사진이나 영상을 보내주시면 빠르게 확인 후 연락드리겠습니다.\n help_korea@volvocars.com\n감사합니다.";
    var sms5 = "Volvo 자동차 고객지원팀 " + userName + " 드림";
    var emailText = sms1 + "\n" + sms2 + "\n" + "\n" + "\n" + sms5;
    // Clipboard API를 사용하여 텍스트를 복사합니다.
    navigator.clipboard.writeText(emailText)
        .then(function() {
		console.log('Copied');
            alert('사진 및 동영상 요청에 대한 SMS 템플릿이 복사되었습니다.');
	})
        .catch(function(error) {
		console.error('클립보드 복사 실패: ',
		error);
            alert('클립보드 복사 실패: ' + error);
	});}
	
function defaultsms() {
	var sms1 = "[Volvo 고객지원]";
    var sms2 = "안녕하세요, 고객님. 문의 주신 내용 회신 드립니다.";
    var sms5 = "Volvo 자동차 고객지원팀 " + userName + " 드림";
    var emailText = sms1 + "\n" + sms2 + "\n" + "\n" + sms5;
    // Clipboard API를 사용하여 텍스트를 복사합니다.
    navigator.clipboard.writeText(emailText)
        .then(function() {
		console.log('Copied');
            alert('기본 메시지에 대한 SMS 템플릿이 복사되었습니다.');
	})
        .catch(function(error) {
		console.error('클립보드 복사 실패: ',
		error);
            alert('클립보드 복사 실패: ' + error);
	});}

function logging16() {
	var sms1 = "제목:  [고객지원센터_불만_서비스센터 또는 딜러사] (고객명) 고객 / (차량번호) / (불만 요약) 불만 건 \n안녕하십니까. \n볼보 자동차 고객지원팀 " + userName + "입니다.\n\n1. 고객정보 \n  - 고객명: \n  - 연락처: \n\n2. 차량정보 \n  - 차종/차량번호: \n  - 차대번호: \n  - 차량등록일: \n\n3. 딜러 및 영업사원 정보\n  - 입고된 서비스센터 / 구입 전시장:\n  - 판매딜러사: \n\n4. 백오더 해상시(딜러사 기재사항)\n  - 오더번호:\n  - 오더일자: \n  - 오더수량: \n  - 부품번호: \n  - 백오더 배송관련 마지막 전달받은 내용: \n\n5. 고객 불만/요청 사항(고객 주장)\n◻ 불만 내용 : \n\n◻ 요구 사항: \n- \n- 해당 고객 요청사항에 대해 대응 부탁드리며 완료 시 회신부탁드립니다\n6. 고객센터 안내사항 \n◻ \n7. 딜러사 회신 내용(딜러사 기재사항 필수): 고객에게 공유되면 안되는 내용은 붉은색으로 표기 부탁드립니다. \n\n감사합니다. \n\n" + userName + " 드림.";
    // Clipboard API를 사용하여 텍스트를 복사합니다.
    navigator.clipboard.writeText(sms1)
        .then(function() {
		console.log('default mail Copied');
            alert('메일 양식이 복사되었습니다.');
	})
        .catch(function(error) {
		console.error('클립보드 복사 실패: ',
		error);
            alert('클립보드 복사 실패: ' + error);
	});}
	
function logging17() {
	var sms1 = "제목: [고객지원팀] 견인 현장 조치 불가 엔지니어 출동 요청 건 \n안녕하십니까. \n볼보 자동차 고객지원팀 " + userName + "입니다. \n - 고객명: \n - 연락처: \n - 차량 위치 \n - 차종 / 차량번호: \n - 차대번호 \n - 최초 등록일: \n2. 출동 사유 \n- \n3. 출동 요청 서비스센터\n\n감사합니다. \n\n" + userName + " 드림.";
    // Clipboard API를 사용하여 텍스트를 복사합니다.
    navigator.clipboard.writeText(sms1)
        .then(function() {
		console.log('default mail Copied');
            alert('메일 양식이 복사되었습니다.');
	})
        .catch(function(error) {
		console.error('클립보드 복사 실패: ',
		error);
            alert('클립보드 복사 실패: ' + error);
	});}
	
function logging18() {
	var sms1 = "제목 : [고객지원팀] (이벤트 차종) 시승 이벤트 상품권 미지급 문의_(고객명) 고객\n\n안녕하십니까\n볼보 라이프스타일 고객지원팀 " + userName + " 입니다.\n\n◻ 고객명: \n◻ 연락처: \n◻ 시승 전시장: \n\n위 고객님께서 (차종) 시승 이벤트 신청 후 (날짜)(전시장) 전시장에 방문하여 시승을 완료했으나, 상품권을 받지 못하셨다하시어 확인 및 빠른 발급 요청주셨습니다.\n\n바쁘시겠지만 고객 안내를 위해 내용 확인 후 회신 부탁드립니다.\n감사합니다.\n\n" + userName + " 드림.";
    // Clipboard API를 사용하여 텍스트를 복사합니다.
    navigator.clipboard.writeText(sms1)
        .then(function() {
		console.log('default mail Copied');
            alert('상품권 미지급 템플릿 복사되었습니다.');
	})
        .catch(function(error) {
		console.error('클립보드 복사 실패: ',
		error);
            alert('클립보드 복사 실패: ' + error);
	});}
	
function hejvolvo() {
	var sms1 = "제목: [고객지원팀] 헤이볼보앱 (문의 사항)문의\n\안녕하십니까\n고객지원팀" + userName + "입니다.\n하기 내용으로 문의주시어 확인 요청드립니다.\n\n - 고객명: \n - 연락처: \n - 차종/차대번호: \n - 앱 아이디: \n문의 사항: \n- \n감사합니다.\n\n" + userName + " 드림.";
    // Clipboard API를 사용하여 텍스트를 복사합니다.
    navigator.clipboard.writeText(sms1)
        .then(function() {
		console.log('default mail Copied');
            alert('헤이볼보앱 문의 템플릿 복사되었습니다.');
	})
        .catch(function(error) {
		console.error('클립보드 복사 실패: ',
		error);
            alert('클립보드 복사 실패: ' + error);
	});}
	
function declinemarketing() {
		var sms1 = "제목: [고객지원팀] 마케팅 수신 거부 요청\n\안녕하십니까\n고객지원팀" + userName + "입니다.\n\n - 고객명: \n - 연락처: \n 상기 고객께서 마케팅 수신 거부 요청 주시어 수정 요청 드립니다. \n\n감사합니다.\n\n" + userName + " 드림.";
    // Clipboard API를 사용하여 텍스트를 복사합니다.
    navigator.clipboard.writeText(sms1)
        .then(function() {
		console.log('default mail Copied');
            alert('헤이볼보앱 문의 템플릿 복사되었습니다.');
	})
        .catch(function(error) {
		console.error('클립보드 복사 실패: ',
		error);
            alert('클립보드 복사 실패: ' + error);
	});}
	
function removedata() {
		var sms1 = "제목: [고객지원팀] 마케팅 수신 거부 요청\n\안녕하십니까\n고객지원팀" + userName + "입니다.\n\n - 고객명: \n - 연락처: \n 상기 고객께서 고객 정보 삭제 요청 주시어 삭제 요청 드립니다. \n\n감사합니다.\n\n" + userName + " 드림.";
    // Clipboard API를 사용하여 텍스트를 복사합니다.
    navigator.clipboard.writeText(sms1)
        .then(function() {
		console.log('default mail Copied');
            alert('헤이볼보앱 문의 템플릿 복사되었습니다.');
	})
        .catch(function(error) {
		console.error('클립보드 복사 실패: ',
		error);
            alert('클립보드 복사 실패: ' + error);
	});}
	
function ex30cancel() {
		var sms1 = "제목: [고객지원팀] EX30 예약 취소 요청\n\안녕하십니까\n고객지원팀" + userName + "입니다.\n\n - 고객명: \n - 연락처: \n - 예약 전시장: \n - 예약 일자: \n - 예약 번호(모르면 N/A): KR-  \n상기 고객께서 볼보 자동차 홈페이지를 통해 예약 취소가 불가능하시어 취소 요청 드립니다.\n바쁘시겠지만 고객 대응 후 회신 부탁드립니다. \n감사합니다.\n\n" + userName + " 드림.";
    // Clipboard API를 사용하여 텍스트를 복사합니다.
    navigator.clipboard.writeText(sms1)
        .then(function() {
		console.log('mail Copied');
            alert('EX30 취소 문의 템플릿 복사되었습니다.');
	})
        .catch(function(error) {
		console.error('클립보드 복사 실패: ',
		error);
            alert('클립보드 복사 실패: ' + error);
	});}
	
	
function ls1() {
	var sms1 = "[볼보 라이프스타일 숍]";
    var sms2 = "안녕하세요, 고객님. \n볼보 고객지원센터 연락처 입니다. \n☎ 1588-1777";
    var sms4 = "볼보 라이프스타일 숍 " + userName + " 드림";
    var emailText = sms1 + "\n" + sms2 + "\n" + "\n" + sms4
    // Clipboard API를 사용하여 텍스트를 복사합니다.
    navigator.clipboard.writeText(emailText)
        .then(function() {
		console.log('CC number Copied');
            alert('고객 지원 센터 번호가 복사되었습니다.');
	})
        .catch(function(error) {
		console.error('클립보드 복사 실패: ',
		error);
            alert('클립보드 복사 실패: ' + error);
	});}
	
function ls2() {
	var sms1 = "* 예약 히스토리 확인 방법: EX30 예약 히스토리 보기 : 메인화면 ->  EX30  예약하기 클릭 -> 로그인 -> 오른쪽 상단의 이름 클릭 -> 내 예약 히스토리\n안녕하십니까? \n볼보 라이프스타일 고객센터 입니다.\n해당고객 온라인으로 취소를 진행하려 했으나 로그인이 원활하지 않아 환불 요청 하셨습니다. 확인 부탁드립니다.\n\n- 고객명: \n- 연락처: \n- 신청 전시장:\n- 예약번호: KR -\n\n감사합니다.";
    // Clipboard API를 사용하여 텍스트를 복사합니다.
    navigator.clipboard.writeText(sms1)
        .then(function() {
		console.log('CC number Copied');
            alert('온라인 예약 취소 요청이 복사되었습니다.');
	})
        .catch(function(error) {
		console.error('클립보드 복사 실패: ',
		error);
            alert('클립보드 복사 실패: ' + error);
	});}
        
//메일 양식 5번째
function copylogging5() {
	var customerName = "고객명: ";
    var carNumber = "차량번호: ";
    var carVin = "차대번호: ";
    var serviceCenter = "요청 서비스센터: ";
    var emailText = customerName + "\n" + carNumber + "\n" + carVin + "\n" + serviceCenter;
    // Clipboard API를 사용하여 텍스트를 복사합니다.
    navigator.clipboard.writeText(emailText)
        .then(function() {
		console.log('메일 양식이 복사되었습니다.');
            alert('메일 양식이 복사되었습니다.');
	})
        .catch(function(error) {
		console.error('클립보드 복사 실패: ',
		error);
            alert('클립보드 복사 실패: ' + error);
	});
}
//메일 양식 6번째
function copylogging6() {
	var customerName = "고객명: ";
    var carNumber = "차량번호: ";
    var carVin = "차대번호: ";
    var serviceCenter = "요청 서비스센터: ";
    var cxneeds= "고객 요청(문의) 사항: ";
    var needvalue= "-";
    var agentanswer= "Agent 답변: ";
    var emailText = customerName + "\n" + carNumber + "\n" + carVin + "\n" +  serviceCenter + "\n" + cxneeds + "\n" + needvalue + "\n" + needvalue + "\n" + needvalue + "\n" + agentanswer;
    // Clipboard API를 사용하여 텍스트를 복사합니다.
    navigator.clipboard.writeText(emailText)
        .then(function() {
		console.log('메일 양식이 복사되었습니다.');
            alert('메일 양식이 복사되었습니다.');
	})
        .catch(function(error) {
		console.error('클립보드 복사 실패: ',
		error);
            alert('클립보드 복사 실패: ' + error);
	});
}