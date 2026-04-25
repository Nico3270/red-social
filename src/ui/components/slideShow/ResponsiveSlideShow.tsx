"use client";

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation, Autoplay } from "swiper/modules";
import Image from "next/image";
import {
    PLACEHOLDER_PRODUCT_IMAGE,
    isRenderableImageSource,
    resolveSafeImageSource,
} from "@/lib/media/resolveSafeImageSource";
import { getCloudinaryImageUrl } from "@/lib/cloudinary/buildCloudinaryDeliveryUrl";
import { logProductImageDiagnostics } from "@/lib/media/productImageDiagnostics";

// Import Swiper styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "./slideshow.css";

interface Props {
    images: string[];
    title: string;
    productSlug?: string;
    productId?: string;
}

function ProductSlideImage({
    image,
    title,
    productSlug,
    productId,
}: {
    image: string;
    title: string;
    productSlug?: string;
    productId?: string;
}) {
    const [src, setSrc] = React.useState(() =>
        resolveSafeImageSource(image, PLACEHOLDER_PRODUCT_IMAGE)
    );

    React.useEffect(() => {
        setSrc(resolveSafeImageSource(image, PLACEHOLDER_PRODUCT_IMAGE));
    }, [image]);

    const optimizedImageUrl = getCloudinaryImageUrl(src, "product-detail");

    const handleError = () => {
        logProductImageDiagnostics({
            area: "product-detail-slideshow",
            event: "detail_image_render_failed",
            message: "next/image no pudo renderizar una imagen del detalle.",
            product: {
                id: productId,
                slug: productSlug,
                nombre: title,
            },
            imageUrls: [image],
            selectedImageUrl: src,
            context: {
                fallbackImage: PLACEHOLDER_PRODUCT_IMAGE,
            },
            level: "warn",
            dedupeKey: `product-detail-slideshow-failed:${productId ?? productSlug ?? title}:${src}`,
        });

        if (src !== PLACEHOLDER_PRODUCT_IMAGE) {
            setSrc(PLACEHOLDER_PRODUCT_IMAGE);
        }
    };

    return (
        <Image
            priority
            src={optimizedImageUrl}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            quality={80}
            onError={handleError}
            className="object-cover rounded-xl shadow-xl border border-gray-100 "
        />
    );
}

export const ResponsiveSlideShow: React.FC<Props> = ({ images, title, productSlug, productId }) => {
    const renderableImages = images.filter(isRenderableImageSource);
    const slideshowImages = renderableImages.length > 0 ? renderableImages : [PLACEHOLDER_PRODUCT_IMAGE];

    return (
        <div className="w-full slideshow-container">
            <Swiper
                spaceBetween={10}
                slidesPerView={1}
                navigation={true}
                pagination={{ clickable: true }}
                loop={slideshowImages.length > 1}
                autoplay={
                    slideshowImages.length > 1
                        ? { delay: 7000, disableOnInteraction: false }
                        : false
                }
                modules={[Pagination, Navigation, Autoplay]}
                aria-label={`Carrusel de imágenes para ${title}`}
                className="mySwiper"
            >
                {slideshowImages.length > 0 ? (
                    slideshowImages.map((image) => (
                        <SwiperSlide key={image}>
                            <div className="relative w-full h-[400px] md:h-[500px] slideshow-container">
                                <ProductSlideImage
                                    image={image}
                                    title={title}
                                    productSlug={productSlug}
                                    productId={productId}
                                />
                            </div>
                        </SwiperSlide>

                    ))
                ) : (
                    <div className="relative w-full h-[400px] md:h-[500px] flex items-center justify-center bg-gray-200">
                        <p className="text-gray-500">No hay imágenes disponibles</p>
                    </div>
                )}
            </Swiper>
        </div>
    );
};
