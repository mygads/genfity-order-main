"use client";
import React from "react";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";

export default function HeroScrollDemo() {
    return (
        <div className="flex flex-col overflow-visible">
            <ContainerScroll
                titleComponent={
                    <>
                        {/* Title handled by parent component */}
                    </>
                }
            >
                <div className="relative w-full h-full">
                    <img
                        src="/images/landing/hero/hero-landing.png"
                        alt="hero"
                        height={720}
                        width={1400}
                        className="mx-auto rounded-2xl object-cover w-full h-full shadow-2xl"
                        draggable={false}
                    />
                    
                    {/* Floating Cart Icon - Left Center */}
                    <div className="absolute -left-6 md:-left-14 top-1/2 transform -translate-y-1/2 z-20 ">
                        <img 
                            src="/images/landing/hero/icon-cart.png" 
                            alt="Shopping Cart"
                            className="w-12 md:w-24 drop-shadow-2xl"
                        />
                    </div>

                    {/* Floating POS/Chat Icon - Top Right */}
                    <div className="absolute -right-8 md:-right-14 -top-8 md:-top-10 z-20 " style={{ animationDelay: '1.5s' }}>
                        <img 
                            src="/images/landing/hero/icon-chat.png" 
                            alt="POS System"
                            className="w-20 md:w-30 drop-shadow-2xl"
                        />
                    </div>
                </div>
            </ContainerScroll>
        </div>
    );
}
