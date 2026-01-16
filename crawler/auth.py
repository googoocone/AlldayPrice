"""
올프 크롤러 - 로그인 및 세션 관리
Playwright를 사용하여 올리브영 로그인 상태를 관리합니다.
"""
import os
import asyncio
from playwright.async_api import async_playwright, Browser, BrowserContext, Page
from config import BROWSER_STATE_PATH, OLIVEYOUNG_LOGIN_URL, OLIVEYOUNG_MYPAGE_URL


class AuthManager:
    """올리브영 로그인 세션 관리 클래스"""
    
    def __init__(self):
        self.playwright = None
        self.browser: Browser = None
        self.context: BrowserContext = None
        self.page: Page = None
        self.state_file = os.path.join(BROWSER_STATE_PATH, "state.json")
        
        # 브라우저 상태 저장 폴더 생성
        os.makedirs(BROWSER_STATE_PATH, exist_ok=True)
    
    async def initialize(self, headless: bool = True):
        """브라우저 초기화"""
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(headless=headless)
        
        # 저장된 상태가 있으면 로드
        if os.path.exists(self.state_file):
            print("📂 저장된 브라우저 상태를 로드합니다...")
            self.context = await self.browser.new_context(storage_state=self.state_file)
        else:
            print("🆕 새로운 브라우저 컨텍스트를 생성합니다...")
            self.context = await self.browser.new_context()
        
        self.page = await self.context.new_page()
    
    async def check_login_status(self) -> bool:
        """로그인 상태 확인 (마이페이지 접근 가능 여부로 체크)"""
        try:
            await self.page.goto(OLIVEYOUNG_MYPAGE_URL, wait_until="networkidle", timeout=30000)
            
            # 로그인 페이지로 리다이렉트되었는지 확인
            current_url = self.page.url
            if "getLoginPage" in current_url or "login" in current_url.lower():
                print("❌ 로그인이 필요합니다.")
                return False
            
            # 마이페이지 요소 확인
            mypage_element = await self.page.query_selector(".mypage-wrap, .my-page, #myPage")
            if mypage_element:
                print("✅ 로그인 상태가 유효합니다.")
                return True
            
            print("⚠️ 로그인 상태를 확인할 수 없습니다.")
            return False
            
        except Exception as e:
            print(f"❌ 로그인 상태 확인 중 오류: {e}")
            return False
    
    async def manual_login(self):
        """수동 로그인 (브라우저를 열고 사용자가 직접 로그인)"""
        print("\n" + "="*50)
        print("🔐 수동 로그인이 필요합니다!")
        print("="*50)
        print("1. 브라우저 창이 열립니다.")
        print("2. 올리브영에 로그인해주세요.")
        print("3. 로그인 완료 후 이 터미널에서 Enter를 눌러주세요.")
        print("="*50 + "\n")
        
        # 메인 페이지로 이동
        await self.page.goto(OLIVEYOUNG_LOGIN_URL, wait_until="networkidle")
        
        # 사용자 입력 대기
        input("로그인 완료 후 Enter를 눌러주세요...")
        
        # 로그인 상태 확인 없이 바로 저장 (사용자를 신뢰)
        await self.save_state()
        print("✅ 브라우저 상태가 저장되었습니다! 크롤링을 시작합니다.")
        return True
    
    async def save_state(self):
        """브라우저 상태(쿠키, 세션) 저장"""
        await self.context.storage_state(path=self.state_file)
        print(f"💾 브라우저 상태 저장 완료: {self.state_file}")
    
    async def ensure_logged_in(self, headless: bool = False) -> bool:
        """로그인 상태 확인 및 필요시 수동 로그인 진행"""
        await self.initialize(headless=headless)
        
        if await self.check_login_status():
            return True
        
        # 수동 로그인 필요 - headless 모드 끄고 다시 시작
        if headless:
            await self.close()
            await self.initialize(headless=False)
        
        return await self.manual_login()
    
    async def get_page(self) -> Page:
        """현재 페이지 반환"""
        return self.page
    
    async def close(self):
        """브라우저 종료"""
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
        print("🔒 브라우저가 종료되었습니다.")


async def main():
    """테스트용 메인 함수"""
    auth = AuthManager()
    try:
        # headless=False로 시작하여 수동 로그인 가능하게
        if await auth.ensure_logged_in(headless=False):
            print("\n🎉 로그인 성공! 크롤링을 시작할 수 있습니다.")
        else:
            print("\n❌ 로그인 실패. 크롤링을 진행할 수 없습니다.")
    finally:
        await auth.close()


if __name__ == "__main__":
    asyncio.run(main())
