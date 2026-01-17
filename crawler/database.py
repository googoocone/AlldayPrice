"""
올프 크롤러 - Supabase 데이터베이스 연동
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_KEY


class Database:
    """Supabase 데이터베이스 연동 클래스"""
    
    def __init__(self):
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError("SUPABASE_URL과 SUPABASE_KEY 환경변수를 설정해주세요.")
        
        self.client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Supabase 연결 완료")
    
    # ========== 상품 관련 ==========
    
    def get_product_by_oliveyoung_id(self, oliveyoung_id: str) -> Optional[Dict]:
        """올리브영 ID로 상품 조회"""
        result = self.client.table("products").select("*").eq("oliveyoung_id", oliveyoung_id).execute()
        return result.data[0] if result.data else None
    
    def get_all_oliveyoung_ids(self) -> Dict[str, str]:
        """모든 상품의 oliveyoung_id -> product_id 맵핑 조회 (캐싱용)"""
        result = self.client.table("products").select("id, oliveyoung_id").execute()
        return {item["oliveyoung_id"]: item["id"] for item in result.data} if result.data else {}
    
    def upsert_product(self, product_data: Dict) -> Dict:
        """상품 추가 또는 업데이트"""
        existing = self.get_product_by_oliveyoung_id(product_data["oliveyoung_id"])
        
        if existing:
            # 기존 상품 업데이트
            result = self.client.table("products").update({
                "name": product_data["name"],
                "brand": product_data["brand"],
                "category": product_data["category"],
                "image_url": product_data.get("image_url"),
                "product_url": product_data["product_url"],
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", existing["id"]).execute()
            
            print(f"  📝 상품 업데이트: {product_data['name'][:30]}...")
            return result.data[0] if result.data else existing
        else:
            # 새 상품 추가
            result = self.client.table("products").insert({
                "oliveyoung_id": product_data["oliveyoung_id"],
                "name": product_data["name"],
                "brand": product_data["brand"],
                "category": product_data["category"],
                "image_url": product_data.get("image_url"),
                "product_url": product_data["product_url"]
            }).execute()
            
            print(f"  ✨ 새 상품 추가: {product_data['name'][:30]}...")
            return result.data[0] if result.data else None
    
    # ========== 가격 이력 관련 ==========
    
    def add_price_history(self, product_id: str, price: int, original_price: int, 
                          discount_rate: int = 0, is_on_sale: bool = False) -> Dict:
        """가격 이력 추가"""
        result = self.client.table("price_history").insert({
            "product_id": product_id,
            "price": price,
            "original_price": original_price,
            "discount_rate": discount_rate,
            "is_on_sale": is_on_sale
        }).execute()
        
        return result.data[0] if result.data else None
    
    def get_latest_price(self, product_id: str) -> Optional[Dict]:
        """상품의 최신 가격 조회"""
        result = self.client.table("price_history")\
            .select("*")\
            .eq("product_id", product_id)\
            .order("recorded_at", desc=True)\
            .limit(1)\
            .execute()
        
        return result.data[0] if result.data else None
    
    # ========== 쿠폰 관련 ==========
    
    def get_coupon_by_brand(self, brand: str, coupon_name: str) -> Optional[Dict]:
        """브랜드와 쿠폰명으로 쿠폰 조회"""
        result = self.client.table("coupons")\
            .select("*")\
            .eq("brand", brand)\
            .eq("coupon_name", coupon_name)\
            .execute()
        
        return result.data[0] if result.data else None
    
    def upsert_coupon(self, coupon_data: Dict) -> Dict:
        """쿠폰 추가 또는 업데이트"""
        existing = self.get_coupon_by_brand(coupon_data["brand"], coupon_data["coupon_name"])
        
        if existing:
            # 기존 쿠폰 업데이트
            result = self.client.table("coupons").update({
                "discount_type": coupon_data["discount_type"],
                "discount_value": coupon_data["discount_value"],
                "min_purchase": coupon_data.get("min_purchase"),
                "max_discount": coupon_data.get("max_discount"),
                "expires_at": coupon_data.get("expires_at"),
                "is_active": True,
                "recorded_at": datetime.utcnow().isoformat()
            }).eq("id", existing["id"]).execute()
            
            print(f"  📝 쿠폰 업데이트: {coupon_data['brand']} - {coupon_data['coupon_name']}")
            return result.data[0] if result.data else existing
        else:
            # 새 쿠폰 추가
            result = self.client.table("coupons").insert({
                "brand": coupon_data["brand"],
                "coupon_name": coupon_data["coupon_name"],
                "discount_type": coupon_data["discount_type"],
                "discount_value": coupon_data["discount_value"],
                "min_purchase": coupon_data.get("min_purchase"),
                "max_discount": coupon_data.get("max_discount"),
                "expires_at": coupon_data.get("expires_at"),
                "is_active": True
            }).execute()
            
            print(f"  🎫 새 쿠폰 추가: {coupon_data['brand']} - {coupon_data['coupon_name']}")
            return result.data[0] if result.data else None
    
    def deactivate_expired_coupons(self) -> int:
        """만료된 쿠폰 비활성화"""
        now = datetime.utcnow().isoformat()
        result = self.client.table("coupons")\
            .update({"is_active": False})\
            .lt("expires_at", now)\
            .eq("is_active", True)\
            .execute()
        
        count = len(result.data) if result.data else 0
        if count > 0:
            print(f"  ⏰ {count}개의 만료된 쿠폰을 비활성화했습니다.")
        return count
    
    # ========== 통계 관련 ==========
    
    def get_stats(self) -> Dict:
        """전체 통계 조회"""
        products = self.client.table("products").select("id", count="exact").execute()
        coupons = self.client.table("coupons").select("id", count="exact").eq("is_active", True).execute()
        
        return {
            "total_products": products.count or 0,
            "active_coupons": coupons.count or 0
        }


# 테스트용
if __name__ == "__main__":
    db = Database()
    stats = db.get_stats()
    print(f"\n📊 현재 통계:")
    print(f"  - 전체 상품: {stats['total_products']}개")
    print(f"  - 활성 쿠폰: {stats['active_coupons']}개")
