'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building, Calendar, Clock, Users, Shield, CheckCircle, ArrowRight } from 'lucide-react';
import { SignInButton, SignUpButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (isSignedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Building className="h-12 w-12 text-primary mx-auto" />
          <h2 className="text-2xl font-bold">Welcome back!</h2>
          <p className="text-muted-foreground">Redirecting to your dashboard...</p>
          <Link href="/dashboard">
            <Button className="flex items-center gap-2">
              Go to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <Building className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold">Hostel Management</h1>
                <p className="text-xs text-muted-foreground">Room Booking System</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <SignInButton mode="modal">
                <Button variant="ghost">Sign In</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button>Get Started</Button>
              </SignUpButton>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto text-center space-y-8 max-w-4xl">
          <div className="space-y-4">
            <Badge variant="outline" className="px-4 py-1">
              Smart Room Management
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              Book Study Rooms with{' '}
              <span className="text-primary">Accountability</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Real-time room availability, 15-minute precision booking, and built-in damage reporting 
              for hostel common rooms across H1-H7.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <SignUpButton mode="modal">
              <Button size="lg" className="px-8">
                Start Booking Now
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </SignUpButton>
            <Button variant="outline" size="lg" className="px-8">
              View Demo
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">7</div>
              <div className="text-sm text-muted-foreground">Hostels</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">15min</div>
              <div className="text-sm text-muted-foreground">Slot Precision</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">2hr</div>
              <div className="text-sm text-muted-foreground">Max Duration</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">24/7</div>
              <div className="text-sm text-muted-foreground">Availability</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="container mx-auto space-y-12 max-w-6xl">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold">Why Choose Our System?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built specifically for hostel environments with accountability and fairness in mind.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Calendar className="h-8 w-8 text-primary" />
                <CardTitle>Real-time Availability</CardTitle>
                <CardDescription>
                  See live slot availability across all hostels with 15-minute precision
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Live booking updates
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Visual availability grid
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Instant confirmation
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-8 w-8 text-primary" />
                <CardTitle>Built-in Accountability</CardTitle>
                <CardDescription>
                  QR-based check-in/out and damage reporting system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    QR code check-in
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Damage reporting
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Usage tracking
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Clock className="h-8 w-8 text-primary" />
                <CardTitle>Fair Usage Limits</CardTitle>
                <CardDescription>
                  Balanced booking system with daily and weekly limits
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    2 bookings per day
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    6 hours per week
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Fair scoring system
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto text-center space-y-8 max-w-3xl">
          <h2 className="text-3xl font-bold">Ready to Get Started?</h2>
          <p className="text-lg text-muted-foreground">
            Join students across H1-H7 hostels who are already using our smart booking system.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <SignUpButton mode="modal">
              <Button size="lg" className="px-8">
                Create Account
                <Users className="h-4 w-4 ml-2" />
              </Button>
            </SignUpButton>
            <SignInButton mode="modal">
              <Button variant="outline" size="lg" className="px-8">
                Already have an account?
              </Button>
            </SignInButton>
          </div>
        </div>
      </section>
    </div>
  );
}