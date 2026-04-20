"use client";

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation, Autoplay } from "swiper/modules";
import Image from "next/image";
import {
    PLACEHOLDER_PRODUCT_IMAGE,
    isRenderableImageSource,
} from "@/lib/media/resolveSafeImageSource";

// Import Swiper styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "./slideshow.css";

interface Props {
    images: string[];
    title: string;
}

export const ResponsiveSlideShow: React.FC<Props> = ({ images, title }) => {
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
                                <Image
                                    priority
                                    src={image}
                                    alt={title}
                                    fill
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    className="object-cover rounded-xl shadow-xl border border-gray-100 "
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
