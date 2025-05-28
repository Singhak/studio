"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SPORTS_TYPES, SportType } from "@/lib/types";
import { PlusCircle, Trash2, Building, MapPin, Info, Phone, Mail, DollarSign, Clock } from "lucide-react";

const serviceSchema = z.object({
  name: z.string().min(1, "Service name is required."),
  description: z.string().optional(),
  price: z.preprocess(
    (a) => parseFloat(z.string().parse(a)),
    z.number().positive("Price must be positive.")
  ),
  durationMinutes: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number().int().positive("Duration must be positive.")
  ),
});

const formSchema = z.object({
  clubName: z.string().min(3, "Club name must be at least 3 characters."),
  sport: z.enum(SPORTS_TYPES, { required_error: "Please select a sport." }),
  location: z.string().min(5, "Location is required."),
  description: z.string().min(20, "Description must be at least 20 characters.").max(500, "Description too long."),
  contactEmail: z.string().email("Invalid email address.").optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  services: z.array(serviceSchema).min(1, "At least one service is required."),
});

export function ClubRegistrationForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clubName: "",
      sport: undefined,
      location: "",
      description: "",
      contactEmail: "",
      contactPhone: "",
      services: [{ name: "", price: 0, durationMinutes: 60 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "services",
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("Club registration data:", values);
    alert("Club registration submitted! (See console for data)");
  }

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center">
          <Building className="mr-3 h-7 w-7 text-primary" /> Register Your Club
        </CardTitle>
        <CardDescription>
          List your sports club on Courtly to reach more players and manage bookings easily.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="clubName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Building className="mr-2 h-4 w-4 text-muted-foreground"/>Club Name</FormLabel>
                  <FormControl><Input placeholder="e.g., City Sports Arena" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="sport"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><Info className="mr-2 h-4 w-4 text-muted-foreground"/>Primary Sport</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select a sport" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {SPORTS_TYPES.map(sport => (
                          <SelectItem key={sport} value={sport}>{sport}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><MapPin className="mr-2 h-4 w-4 text-muted-foreground"/>Location / Address</FormLabel>
                    <FormControl><Input placeholder="123 Sporty Drive, Cityville" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Info className="mr-2 h-4 w-4 text-muted-foreground"/>Club Description</FormLabel>
                  <FormControl><Textarea placeholder="Tell us about your club, facilities, and atmosphere..." {...field} rows={4}/></FormControl>
                  <FormDescription>Max 500 characters. Highlight what makes your club special.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid md:grid-cols-2 gap-6">
                <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground"/>Contact Email (Optional)</FormLabel>
                    <FormControl><Input type="email" placeholder="contact@yourclub.com" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="flex items-center"><Phone className="mr-2 h-4 w-4 text-muted-foreground"/>Contact Phone (Optional)</FormLabel>
                    <FormControl><Input type="tel" placeholder="+1 555 123 4567" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

            {/* Services Section */}
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-xl">Services & Pricing</CardTitle>
                <CardDescription>Define the services you offer, like court rentals or coaching.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-md space-y-4 relative bg-background/50">
                    <FormField
                      control={form.control}
                      name={`services.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center"><Info className="mr-2 h-4 w-4 text-muted-foreground"/>Service Name #{index + 1}</FormLabel>
                          <FormControl><Input placeholder="e.g., Tennis Court Rental (1hr)" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`services.${index}.price`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center"><DollarSign className="mr-2 h-4 w-4 text-muted-foreground"/>Price ($)</FormLabel>
                            <FormControl><Input type="number" placeholder="25.00" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`services.${index}.durationMinutes`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center"><Clock className="mr-2 h-4 w-4 text-muted-foreground"/>Duration (minutes)</FormLabel>
                            <FormControl><Input type="number" placeholder="60" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                     <FormField
                      control={form.control}
                      name={`services.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center"><Info className="mr-2 h-4 w-4 text-muted-foreground"/>Service Description (Optional)</FormLabel>
                          <FormControl><Textarea placeholder="e.g., Standard hard court, includes basic equipment." {...field} rows={2}/></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => remove(index)}
                        className="absolute top-2 right-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append({ name: "", price: 0, durationMinutes: 60, description: "" })}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Another Service
                </Button>
              </CardContent>
            </Card>
            
            {/* Placeholder for availability settings */}
            <Card className="border-dashed">
              <CardHeader>
                  <CardTitle className="text-xl">Availability (Coming Soon)</CardTitle>
                  <CardDescription>Set your club's general opening hours and manage specific court availability. This feature is under development.</CardDescription>
              </CardHeader>
              <CardContent>
                  <p className="text-muted-foreground text-sm p-4 border rounded-md bg-muted/50">
                    Detailed availability settings will be available here soon. For now, please ensure your club description includes opening hours.
                  </p>
              </CardContent>
            </Card>

            <Button type="submit" size="lg" className="w-full text-base">
              <PlusCircle className="mr-2 h-5 w-5" /> Register Club
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
