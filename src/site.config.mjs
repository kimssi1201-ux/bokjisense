export default {
  name: '복지센스',
  url: 'https://bokjisense.pages.dev',
  description: '생활에 필요한 지원금과 복지 정보를 쉽게 정리합니다.',
  contactEmail: '', // 실제 문의 이메일을 입력하세요.
  operatorName: '', // 실제 운영자명 또는 운영 주체. 가짜 정보를 입력하지 마세요.
  privacyUpdated: '2026-10-04',
  pageSize: 10,
  ads: {
    enabled: false, // 승인 및 개인정보·동의 설정 점검 후 활성화
    publisherId: '', // 실제 ca-pub-... 값
    articleSlot: '', // 실제 광고 단위 ID
    adsTxtEnabled: false
  },
  faqSchema: false // FAQ 내용은 항상 표시. 검색 리치결과는 보장되지 않습니다.
};
export const categories = [
  {slug:'government', name:'정부지원금', description:'정부와 지자체 지원 정보를 대상·신청 절차 중심으로 살펴봅니다.'},
  {slug:'welfare', name:'복지', description:'일상에 필요한 복지제도와 이용 방법을 이해하기 쉽게 정리합니다.'},
  {slug:'life', name:'생활정보', description:'서류 준비부터 공공서비스 이용까지, 생활에 필요한 정보를 모읍니다.'},
  {slug:'finance', name:'금융·환급', description:'금융과 환급 정보를 확인할 때 필요한 절차와 주의사항을 살펴봅니다.'},
  {slug:'jobs', name:'일자리·고용', description:'취업·고용 관련 정보와 공식 공고를 확인하는 방법을 안내합니다.'}
];
