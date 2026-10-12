#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>

static NSString *Insets(UIEdgeInsets i) { return [NSString stringWithFormat:@"{t%g l%g b%g r%g}", i.top, i.left, i.bottom, i.right]; }
static NSString *DInsets(NSDirectionalEdgeInsets i) { return [NSString stringWithFormat:@"{t%g lead%g b%g trail%g}", i.top, i.leading, i.bottom, i.trailing]; }

static NSString *Regions(UIView *v, UIViewReservedRegionKind *kind) {
    NSMutableArray *out = [NSMutableArray array];
    for (UIViewReservedRegion *r in [v reservedRegionsOfKind:kind options:UIViewReservedRegionQueryOptionsIncludeInactive]) {
        [out addObject:[NSString stringWithFormat:@"{active=%d frame=%@}", r.isActive, NSStringFromCGRect(r.frame)]];
    }
    return [NSString stringWithFormat:@"[%@]", [out componentsJoinedByString:@","]];
}

@interface ProbeVC : UIViewController <WKScriptMessageHandler>
@property (nonatomic) WKWebView *web;
@property (nonatomic) UIView *marginChild;
@end

@implementation ProbeVC
- (void)log:(NSString *)event {
    UIView *v = self.view;
    UIWindow *w = v.window;
    UIWindowScene *s = w.windowScene;
    CGRect inScreen = w ? [w convertRect:w.bounds toCoordinateSpace:s.screen.coordinateSpace] : CGRectNull;
    NSLog(@"FOLDPROBE %@ win=%@ screen=%@ orient=%ld hSize=%ld rtl=%ld "
          "view.safe=%@ view.margins=%@ view.dmargins=%@ sysMin=%@ "
          "web.safe=%@ web.margins=%@ child.margins=%@ win.safe=%@ division=%@ occlusion=%@",
          event, NSStringFromCGRect(inScreen), NSStringFromCGRect(s.screen.bounds), (long)s.effectiveGeometry.interfaceOrientation,
          (long)self.traitCollection.horizontalSizeClass, (long)self.traitCollection.layoutDirection,
          Insets(v.safeAreaInsets), Insets(v.layoutMargins), DInsets(v.directionalLayoutMargins),
          DInsets(self.systemMinimumLayoutMargins),
          Insets(self.web.safeAreaInsets), Insets(self.web.layoutMargins), Insets(self.marginChild.layoutMargins),
          Insets(w.safeAreaInsets),
          Regions(v, [UIViewReservedRegionKind divisionRegionKind]),
          Regions(v, [UIViewReservedRegionKind occlusionRegionKind]));
    [self.web evaluateJavaScript:[NSString stringWithFormat:@"r('native:%@')", event] completionHandler:nil];
}

- (void)viewDidLoad {
    [super viewDidLoad];
    self.view.backgroundColor = UIColor.systemBackgroundColor;
    [self registerForTraitChanges:@[UITraitHorizontalSizeClass.class] withHandler:^(ProbeVC *vc, UITraitCollection *p) { [vc log:@"traitChange"]; }];

    WKWebViewConfiguration *cfg = [WKWebViewConfiguration new];
    [cfg.userContentController addScriptMessageHandler:self name:@"probe"];
    self.web = [[WKWebView alloc] initWithFrame:self.view.bounds configuration:cfg];
    self.web.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    self.web.scrollView.contentInsetAdjustmentBehavior = UIScrollViewContentInsetAdjustmentNever;
    [self.view addSubview:self.web];

    // A plain edge-to-edge child with preservesSuperviewLayoutMargins: the UIKit setup the forum says yields the bar-aware margin.
    self.marginChild = [[UIView alloc] initWithFrame:self.view.bounds];
    self.marginChild.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    self.marginChild.preservesSuperviewLayoutMargins = YES;
    self.marginChild.userInteractionEnabled = NO;
    [self.view addSubview:self.marginChild];

    // Visual check: a native red strip on layoutMarginsGuide, a blue page strip on env(safe-area-inset-*).
    UIView *strip = [UIView new];
    strip.translatesAutoresizingMaskIntoConstraints = NO;
    strip.backgroundColor = [UIColor.systemRedColor colorWithAlphaComponent:0.5];
    strip.userInteractionEnabled = NO;
    [self.view addSubview:strip];
    [NSLayoutConstraint activateConstraints:@[
        [strip.leadingAnchor constraintEqualToAnchor:self.view.layoutMarginsGuide.leadingAnchor],
        [strip.trailingAnchor constraintEqualToAnchor:self.view.layoutMarginsGuide.trailingAnchor],
        [strip.centerYAnchor constraintEqualToAnchor:self.view.centerYAnchor constant:-40],
        [strip.heightAnchor constraintEqualToConstant:30],
    ]];

    NSString *html = @"<meta name=viewport content='width=device-width,initial-scale=1,viewport-fit=cover'>"
    "<style>body{margin:0;font:12px -apple-system}"
    "#p{position:fixed;inset:0;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);visibility:hidden}"
    "#b{position:fixed;left:env(safe-area-inset-left);right:env(safe-area-inset-right);top:calc(50% + 10px);height:30px;background:rgba(0,0,255,.5)}"
    "pre{margin:0;padding:env(safe-area-inset-top) env(safe-area-inset-right) 0 env(safe-area-inset-left)}</style>"
    "<pre id=o></pre><div id=p></div><div id=b></div><script>"
    "function r(e){var cs=getComputedStyle(document.getElementById('p'));"
    "var s={event:e,w:innerWidth,h:innerHeight,envT:cs.paddingTop,envR:cs.paddingRight,envB:cs.paddingBottom,envL:cs.paddingLeft};"
    "document.getElementById('o').textContent=JSON.stringify(s,null,1);webkit.messageHandlers.probe.postMessage(JSON.stringify(s));}"
    "addEventListener('resize',function(){r('resize')});r('load');</script>";
    [self.web loadHTMLString:html baseURL:[NSURL URLWithString:@"https://probe.localhost/"]];
}

- (void)userContentController:(WKUserContentController *)c didReceiveScriptMessage:(WKScriptMessage *)m {
    NSLog(@"FOLDPROBE web %@", m.body);
}
- (void)viewDidLayoutSubviews { [super viewDidLayoutSubviews]; [self log:@"layout"]; }
- (void)viewSafeAreaInsetsDidChange { [super viewSafeAreaInsetsDidChange]; [self log:@"safeAreaDidChange"]; }
- (void)viewLayoutMarginsDidChange { [super viewLayoutMarginsDidChange]; [self log:@"marginsDidChange"]; }
@end

@interface SceneDelegate : UIResponder <UIWindowSceneDelegate>
@property (nonatomic) UIWindow *window;
@end
@implementation SceneDelegate
- (void)scene:(UIScene *)scene willConnectToSession:(UISceneSession *)s options:(UISceneConnectionOptions *)o {
    self.window = [[UIWindow alloc] initWithWindowScene:(UIWindowScene *)scene];
    self.window.rootViewController = [ProbeVC new];
    [self.window makeKeyAndVisible];
}
@end

@interface AppDelegate : UIResponder <UIApplicationDelegate>
@end
@implementation AppDelegate
- (UISceneConfiguration *)application:(UIApplication *)a configurationForConnectingSceneSession:(UISceneSession *)s options:(UISceneConnectionOptions *)o {
    UISceneConfiguration *c = [[UISceneConfiguration alloc] initWithName:@"Default" sessionRole:s.role];
    c.delegateClass = SceneDelegate.class;
    return c;
}
@end

int main(int argc, char *argv[]) {
    @autoreleasepool { return UIApplicationMain(argc, argv, nil, NSStringFromClass(AppDelegate.class)); }
}
